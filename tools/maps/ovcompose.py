import json,sys
from PIL import Image
d=json.load(open(sys.argv[1]+'/overview.json'));W,H=d['size'];TW,TH=d['tile']
base=Image.open(sys.argv[1]+'/under.png').convert('RGBA')
for t in d['tiles']:
    im=Image.open(t['src']).convert('RGBA').resize((TW,TH),Image.LANCZOS)
    base.alpha_composite(im,tuple(d['origins'][t['id']]))
over=Image.open(sys.argv[1]+'/over.png').convert('RGBA')
base.alpha_composite(over)
rgb=base.convert('RGB')
rgb.save(sys.argv[2],'WEBP',quality=int(sys.argv[3]),method=6)
rgb.resize((2100,1350),Image.LANCZOS).save(sys.argv[1]+'/preview.png')
rgb.crop((2000,1300,4200,2700)).save(sys.argv[1]+'/crop.png')
print('ok')
