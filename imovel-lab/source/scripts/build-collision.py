"""Decode official Home Scan SOG LOD5 to a conservative floor/obstacle grid.
Usage: python scripts/build-collision.py /path/to/scan (5_0, 5_1 directories).
Requires numpy, Pillow, scipy, matplotlib. Source: CC BY 4.0 Isaiah Sweeney.
"""
import json,sys,pathlib
import numpy as np
from PIL import Image
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy import ndimage as ndi
root=pathlib.Path(sys.argv[1]); points=[]
for d in ['5_0','5_1']:
 p=root/d;m=json.loads((p/'meta.json').read_text());n=m['count']
 lo=np.asarray(Image.open(p/'means_l.webp').convert('RGBA')).reshape(-1,4)[:n,:3].astype(float)
 hi=np.asarray(Image.open(p/'means_u.webp').convert('RGBA')).reshape(-1,4)[:n,:3].astype(float)
 v=(hi*256+lo)/65535*(np.array(m['means']['maxs'])-m['means']['mins'])+m['means']['mins']
 xyz=np.sign(v)*np.expm1(abs(v));xyz[:,:2]*=-1
 a=np.asarray(Image.open(p/'sh0.webp').convert('RGBA')).reshape(-1,4)[:n,3]
 points.append(xyz[a>100])
p=np.concatenate(points);np.save(root/'points.npy',p)
print('bounds',np.min(p,axis=0),np.max(p,axis=0),'y percentiles',np.percentile(p[:,1],[0,5,10,25,50,75,90,100]))
fig,axs=plt.subplots(1,3,figsize=(18,7))
for ax,(low,high) in zip(axs,[(-.2,.2),(.25,1.3),(1.3,2)]):
 q=p[(p[:,1]>low)&(p[:,1]<high)];ax.hist2d(q[:,0],q[:,2],bins=[np.arange(-11,19,.08),np.arange(-16,4,.08)],cmin=2,vmax=30);ax.set_aspect('equal');ax.set_title(f'{low} < height < {high}');ax.plot(-.258,2.078,'ro');ax.grid()
fig.savefig(root/'slices.png',dpi=120)
# 8 cm occupancy cells. Samples at torso/furniture height; ignore floor noise.
resolution=.08;origin=[-10.,-15.5];width=350;height=230
q=p[(p[:,1]>.28)&(p[:,1]<1.8)]
ix=np.floor((q[:,0]-origin[0])/resolution).astype(int);iz=np.floor((q[:,2]-origin[1])/resolution).astype(int)
hits=np.zeros((height,width),dtype=int);valid=(ix>=0)&(ix<width)&(iz>=0)&(iz<height);np.add.at(hits,(iz[valid],ix[valid]),1)
obstacle=hits>=3
obstacle=ndi.binary_closing(obstacle,structure=np.ones((3,3)))
# Close the captured exterior at gaps/windows, retaining the entrance alcove.
perimeter=[[-9.2,1.55],[-1.25,1.55],[-1.25,2.35],[.45,2.35],[.65,1.45],[9.7,.85],[9.85,-8.45],[16.5,-8.65],[16.7,-14.45],[11.7,-14.45],[11.65,-9.5],[9.65,-9.5],[9.65,-13.7],[.1,-13.7],[-.5,-9],[-9.2,-8.85]]
from matplotlib.path import Path
xx,zz=np.meshgrid(origin[0]+(np.arange(width)+.5)*resolution,origin[1]+(np.arange(height)+.5)*resolution)
footprint=Path(perimeter).contains_points(np.c_[xx.ravel(),zz.ravel()]).reshape(height,width)
clearance=ndi.distance_transform_edt(~obstacle)*resolution
free=footprint&(clearance>=.16)
labels,count=ndi.label(free)
start=(int((2.078-origin[1])/resolution),int((-.258-origin[0])/resolution))
free=labels==labels[start]
assert labels[start]>0,'Entrance blocked'
# Row spans make the map compact, portable, and inspectable.
rows=[]
for row in free:
 edges=np.diff(np.r_[False,row,False].astype(int));rows.append(np.column_stack((np.where(edges==1)[0],np.where(edges==-1)[0])).ravel().tolist())
out=pathlib.Path(__file__).resolve().parents[1]/'src/collision-map.json'
out.write_text(json.dumps(dict(origin=origin,resolution=resolution,width=width,height=height,rows=rows),separators=(',',':')))
fig,ax=plt.subplots(figsize=(14,10));ax.imshow(free,origin='lower',extent=[origin[0],origin[0]+width*resolution,origin[1],origin[1]+height*resolution],cmap='Greens',alpha=.5)
q=p[(p[:,1]>.3)&(p[:,1]<1.8)];ax.scatter(q[::4,0],q[::4,2],s=.1,c='black');ax.plot(-.258,2.078,'ro');ax.set_xticks(np.arange(-10,19));ax.set_yticks(np.arange(-15,4));ax.grid(alpha=.3);ax.set_aspect('equal');fig.savefig(root/'collision.png',dpi=130)
print('walkable cells',free.sum(),'map bytes',out.stat().st_size)
