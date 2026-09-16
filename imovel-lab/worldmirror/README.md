# Villa Alpina living room — WorldMirror

Replaces the photo-navigation entry at `/imovel-demo.html` with `/imovel-lab/worldmirror/viewer/`. The Biblioteca root, catalogue, Firebase, hosting settings and other environment demos are not modified.

## Current status

**Prepared, not reconstructed.** The public HF run returned ValueError, then a quota block. There is no genuine Villa Alpina asset in this repository yet. The viewer displays a pending state until it receives a completed `run.json` and real asset. No synthetic room or photo warp is substituted.

This workspace has no NVIDIA device. GitHub static hosting cannot perform CUDA inference. A GPU session is still required. Open `WorldMirror-LivingRoom.ipynb` in Colab with a GPU, or use an existing CUDA machine. No GPU service was purchased or provisioned and no unattended job was scheduled.

## Run on an existing GPU

Use Python 3.11 and the dependencies documented by Tencent. The notebook installs them at pinned upstream commit `df9988efb87bfc0f4947eb3889411cf957478b06`.

```sh
git clone https://github.com/Tencent-Hunyuan/HY-World-2.0.git
git -C HY-World-2.0 checkout df9988efb87bfc0f4947eb3889411cf957478b06
python -m pip install -r HY-World-2.0/requirements.txt
python -m pip install -e HY-World-2.0/hyworld2/worldgen/third_party/gsplat_maskgaussian --no-build-isolation
PYTHONPATH="$PWD/HY-World-2.0" python rdc/imovel-lab/worldmirror/reconstruct.py \
  --zip /path/to/WorldMirror-Villa-Alpina-LivingRoom.zip \
  --output /path/to/new-result --target-size 756
```

All six views are retained. Confidence and edge filtering are enabled, sky filtering is disabled. The official API receives actual filtering settings. A valid camera prior JSON is passed when present; no priors are invented. The default 756-pixel inference limit is a starting point, not a verified maximum stable quality. Options are 518, 756, 952. On out-of-memory, restart with a smaller size and new output folder; never silently omit views.

The only received input archive was `Fotos Casa Villa Alpina(1).zip`. Its six living-room images have original names `01 estar social a/c/d/e/f/g.jpg`. Numbering 02–07 and prior parameters were not available. The extractor accepts either this exact original set or a numbered 02–07 set, fails on ambiguity, and never extracts other house photos. Original photographs are not committed to this public repository.

## Outputs and viewing

The runner exports `scene.glb`, `gaussians.ply`, `points.ply`, numerical depth NPYs plus visualizations, normals, camera JSON, COLMAP data, confidence outputs when supported, and `run.json` containing frame mapping/settings/per-view retained fractions. It also writes an output ZIP. No successful status is written unless all four primary assets exist. A failure is recorded in `run.json`.

The GLB uses triangulated per-view depth grids filtered at all four pixel corners. It shares the splat's OpenCV world frame; the viewer rotates both assets and recovered camera by 180 degrees around X. Surfaces may overlap or have holes. It is not a fused or watertight collision mesh. The per-view retention fraction is not an alignment score. Geometry and orientation have not yet been verified against a real output.

Open the viewer and select `run.json` with `scene.glb` and/or `gaussians.ply` from one run. Local loading does not upload files. Drag to look; WASD moves in the horizontal plane; Q/E changes height; Shift accelerates. This is an inspection camera with arbitrary reconstruction units, not a calibrated collision-aware walkthrough. Touch supports looking; walking controls currently require a keyboard.

Once the real reconstruction is reviewed, publish the approved assets and `run.json` to `viewer/outputs/` for automatic loading. Keep large assets on suitable object hosting if they exceed GitHub limits; no storage service has been configured here. A later production build empties `viewer/`, so preserve/reapply approved outputs after rebuilding.

Build from `../source`: `npm ci && npm run build:worldmirror`. The existing home scan and modeled Villa builds remain separate.

## Next acceptance gate

Check that the sofa, piano, windows and floor align across views; inspect duplicated walls/floaters and every recovered camera. Compare with and without confirmed frame 07 only after identifying its filename. If coherent, retain splats for visual appearance and use Blender to prepare a simple floor/wall/furniture collision proxy. Add eye height, metric calibration and a room-bounded navigation area after review.

References: [official pipeline](https://github.com/Tencent-Hunyuan/HY-World-2.0), [documentation](https://github.com/Tencent-Hunyuan/HY-World-2.0/blob/main/DOCUMENTATION.md). Model license applies to downloaded weights and their use.
