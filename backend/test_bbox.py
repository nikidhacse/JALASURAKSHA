import osmnx as ox
with open("backend/bbox_doc.txt", "w", encoding="utf-8") as f:
    f.write(str(ox.features_from_bbox.__doc__))
print("DOC_WRITTEN")
