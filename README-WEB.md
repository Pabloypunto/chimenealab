# ChimeneaLab — web estática

La interfaz se sirve como una web estática y ejecuta el motor de cálculo en el navegador. No necesita backend ni WordPress.

## Prueba local
Desde la carpeta raíz, ejecuta:

```bash
python -m http.server 8000
```

Abre `http://localhost:8000`. No abras `index.html` directamente con `file://`, porque los módulos ES necesitan servirse por HTTP.

## Publicación con GitHub Pages
1. Sube el contenido de esta carpeta a la raíz de un repositorio público.
2. En GitHub, entra en **Settings → Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**.
4. Elige la rama `main` y la carpeta `/(root)`, y guarda.
5. Espera a que termine el despliegue. La URL será `https://USUARIO.github.io/REPOSITORIO/`.

No hace falta comando de compilación ni carpeta de salida. El archivo `.nojekyll` evita que GitHub Pages omita carpetas o archivos por reglas de Jekyll.

## Netlify / Cloudflare Pages
También puede publicarse conectando el repositorio. Deja vacío el comando de build y usa `.` como directorio de publicación.

## Nota técnica
Los datos iniciales de la curva del aparato y las propiedades del gas son demostrativos. Sustitúyelos por información documentada antes de interpretar el resultado. El modelo no implementa el procedimiento completo UNE-EN 13384-1 ni certifica seguridad o conformidad.