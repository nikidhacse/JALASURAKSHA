import sys
sys.stdout.reconfigure(line_buffering=True)
import osmnx as ox

fn = ox.features_from_bbox if hasattr(ox, 'features_from_bbox') else ox.features.features_from_bbox
print(fn.__doc__[:400], flush=True)
