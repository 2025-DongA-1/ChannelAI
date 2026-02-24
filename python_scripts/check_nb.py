import nbformat as nbf
try:
    with open('ai_experiments.ipynb', 'r', encoding='utf-8') as f:
        nb = nbf.read(f, as_version=4)
        
    for i, c in enumerate(nb.cells):
        print(f"Cell {i} ({c.cell_type}): {c.source[:50]!r}")
except Exception as e:
    print(e)
