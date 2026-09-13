# Imágenes de cartas de UNO (opcional)

Si querés usar tus propias imágenes en vez del diseño dibujado por código
(`components/games/uno/card-face.tsx`), subí acá los archivos con este
nombre exacto — `<color>-<valor>.<png|svg|jpg|webp>`:

```
red-0.png    red-1.png    ...  red-9.png    red-skip.png  red-reverse.png  red-draw2.png
yellow-0.png ...                            yellow-skip.png ...
green-0.png  ...
blue-0.png   ...
wild.png
wild4.png
```

No hace falta subir las 108 cartas del mazo — los duplicados del mismo
color+valor se ven idénticos, así que con una imagen por combinación
alcanza (40 archivos numéricos + 12 especiales + 2 wild = 54 en total).

Las que no subas se siguen viendo con el diseño propio actual — no rompe
nada dejar esta carpeta vacía.

**Importante:** las imágenes que subas acá son tu responsabilidad — este
proyecto no incluye ningún asset con marca registrada de terceros.
