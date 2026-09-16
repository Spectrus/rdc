"""Living-room-only WorldMirror runner. Requires the pinned upstream GPU environment."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import tempfile
from zipfile import ZipFile

UPSTREAM_COMMIT = 'df9988efb87bfc0f4947eb3889411cf957478b06'
ORIGINALS = {f'01 estar social {c}.jpg' for c in 'acdefg'}


def prepare(archive, destination):
    """Select only the six known living-room images; never extract the whole house."""
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    with ZipFile(archive) as z:
        files = [n for n in z.namelist() if not n.endswith('/') and '__MACOSX' not in n]
        selected = [n for n in files if Path(n).name in ORIGINALS]
        if not selected:
            selected = [n for n in files if re.fullmatch(r'0[2-7]\.(jpg|jpeg|png)', Path(n).name, re.I)]
        if len(selected) != 6 or len({Path(n).name for n in selected}) != 6:
            raise ValueError('Expected exactly six living-room originals a/c/d/e/f/g, or files 02–07. No other rooms will be selected.')
        numbered = [int(Path(n).stem) for n in selected if Path(n).stem.isdigit()]
        if numbered and set(numbered) != set(range(2, 8)):
            raise ValueError('Numbered images must cover 02 through 07 exactly once.')
        manifest = []
        for index, name in enumerate(sorted(selected, key=lambda p: Path(p).name)):
            info = z.getinfo(name)
            if info.file_size > 30_000_000:
                raise ValueError('Input image exceeds 30 MB.')
            data = z.read(name)
            (destination / Path(name).name).write_bytes(data)
            manifest.append({'index': index, 'filename': Path(name).name,
                             'sha256': hashlib.sha256(data).hexdigest()})
        prior_files = [n for n in files if Path(n).name == 'camera_params_prior.json']
        if len(prior_files) > 1:
            raise ValueError('Ambiguous camera priors.')
        prior = None
        if prior_files:
            data = z.read(prior_files[0])
            json.loads(data)
            prior = destination.parent / 'camera_params_prior.json'
            prior.write_bytes(data)
        return manifest, prior


def make_mesh(predictions, imgs, paths, target, output):
    """Export connected depth-grid triangles in the SAME world frame as the splat."""
    import numpy as np
    import trimesh
    from hyworld2.worldrecon.hyworldmirror.utils.inference_utils import compute_filter_mask, depth_to_world_coords_points
    _, count, _, height, width = imgs.shape
    masks, _ = compute_filter_mask(predictions, imgs, paths, height, width, count,
        apply_confidence_mask=True, apply_edge_mask=True, apply_sky_mask=False,
        confidence_percentile=10., edge_normal_threshold=1., edge_depth_threshold=.03,
        sky_mask=None, use_gs_depth=False)
    points = depth_to_world_coords_points(predictions['depth'][0, ..., 0],
        predictions['camera_poses'][0], predictions['camera_intrs'][0])[0].detach().cpu().float().numpy()
    colors = imgs[0].detach().cpu().float().numpy().transpose(0, 2, 3, 1)
    scene = trimesh.Scene()
    views = []
    for i in range(count):
        # Full inference grid, with triangles only where all corners pass filtering.
        p, color = points[i], colors[i]
        valid = np.asarray(masks[i], dtype=bool) & np.isfinite(p).all(axis=-1)
        grid = np.arange(height * width).reshape(height, width)
        a, b, c, d = grid[:-1, :-1], grid[:-1, 1:], grid[1:, :-1], grid[1:, 1:]
        keep = valid[:-1, :-1] & valid[:-1, 1:] & valid[1:, :-1] & valid[1:, 1:]
        faces = np.concatenate([np.stack([a[keep], c[keep], b[keep]], axis=-1),
                                np.stack([b[keep], c[keep], d[keep]], axis=-1)])
        mesh = trimesh.Trimesh(vertices=p.reshape(-1, 3), faces=faces,
            vertex_colors=(np.clip(color.reshape(-1, 3), 0, 1) * 255).astype('uint8'), process=False)
        mesh.remove_unreferenced_vertices()
        if len(mesh.faces):
            scene.add_geometry(mesh, node_name=f'view_{i:02d}')
        views.append({'filename': Path(paths[i]).name, 'valid_fraction': float(valid.mean()),
                      'triangles': len(mesh.faces)})
    if not scene.geometry:
        raise RuntimeError('All mesh geometry was filtered out.')
    scene.export(str(output / 'scene.glb'))
    cam = predictions['camera_poses'][0, 0].detach().cpu().float().numpy()
    position = cam[:3, 3]
    look = position + cam[:3, 2]
    return {'position': position.tolist(), 'target': look.tolist()}, views


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--zip', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--target-size', type=int, choices=[518, 756, 952], default=756)
    parser.add_argument('--prepare-only', action='store_true')
    args = parser.parse_args()
    output = args.output.resolve()
    if output.exists() and any(output.iterdir()):
        raise SystemExit('Use a new/empty output folder to avoid mixing reconstruction runs.')
    output.mkdir(parents=True, exist_ok=True)
    manifest = {'status': 'pending', 'engine': 'Tencent WorldMirror 2.0',
        'upstream_commit': UPSTREAM_COMMIT, 'scope': 'living-room-only', 'reviewed': False,
        'settings': {'target_size': args.target_size, 'all_frames': True,
            'confidence_filter': True, 'edge_filter': True, 'sky_filter': False}}
    manifest_path = output / 'run.json'
    try:
        with tempfile.TemporaryDirectory(prefix='villa-living-room-') as tmp:
            images = Path(tmp) / 'images'
            manifest['frames'], prior = prepare(args.zip, images)
            manifest['camera_prior_supplied'] = prior is not None
            if args.prepare_only:
                manifest['status'] = 'inputs-validated'
                manifest_path.write_text(json.dumps(manifest, indent=2))
                print('Validated six living-room frames. Inference has NOT run.')
                return
            import torch
            if not torch.cuda.is_available():
                raise RuntimeError('NVIDIA CUDA GPU required. GitHub static hosting cannot execute WorldMirror.')
            from hyworld2.worldrecon.pipeline import WorldMirrorPipeline
            pipeline = WorldMirrorPipeline.from_pretrained('tencent/HY-World-2.0',
                enable_bf16=torch.cuda.is_bf16_supported())
            original = pipeline._run_inference
            def capture(*parameters):
                predictions, imgs, timing = original(*parameters)
                camera, views = make_mesh(predictions, imgs, parameters[0], parameters[1], output)
                manifest['camera'] = camera
                manifest['per_view'] = views
                return predictions, imgs, timing
            pipeline._run_inference = capture
            pipeline(str(images), strict_output_path=str(output), target_size=args.target_size,
                prior_cam_path=str(prior) if prior else None,
                save_depth=True, save_normal=True, save_gs=True, save_camera=True,
                save_points=True, save_colmap=True, save_conf=True,
                apply_sky_mask=False, apply_edge_mask=True, apply_confidence_mask=True)
            required = ['scene.glb', 'gaussians.ply', 'points.ply', 'camera_params.json']
            for name in required:
                if not (output / name).is_file() or (output / name).stat().st_size == 0:
                    raise RuntimeError(f'Missing output: {name}')
            manifest.update(status='reconstructed', mesh='scene.glb', splat='gaussians.ply',
                coordinate_system='OpenCV c2w; viewer rotates scene and cameras 180 degrees about X',
                collision_ready=False)
            manifest['files'] = [{'name': str(p.relative_to(output)), 'bytes': p.stat().st_size}
                                 for p in sorted(output.rglob('*')) if p.is_file() and p != manifest_path]
            manifest_path.write_text(json.dumps(manifest, indent=2))
            shutil.make_archive(str(output), 'zip', output)
            print(f'Assets saved to {output}; inspect coherence before preparing collisions.')
    except Exception as exc:
        manifest.update(status='failed', error=f'{type(exc).__name__}: {exc}')
        manifest_path.write_text(json.dumps(manifest, indent=2))
        raise

if __name__ == '__main__':
    main()
