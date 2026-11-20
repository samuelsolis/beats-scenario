---
name: charla-beats
description: Crea presentaciones por beats en HTML, CSS y JS puros, sin dependencias: un clic = un beat, escenario fijo de 1920×1080, notas y ventana del presentador, y piezas que se transforman de un beat al siguiente en lugar de diapositivas. Úsala siempre que el usuario quiera preparar una charla, una clase, una ponencia, una formación o una presentación, o seguir una ya hecha con este formato (carpeta con motor.js y escenas.js), aunque diga «diapositivas» o «slides» y no nombre los beats. No la uses si pide expresamente un .pptx o un PDF.
---

# Presentaciones por beats

Una presentación por beats no es una lista de diapositivas: es un escenario fijo donde cada clic cambia algo. Las piezas aparecen, se van o se transforman, y un beat lleva al siguiente. La posición va en la URL (`#3.4` = escena 3, beat 4), así que cualquier beat se reconstruye igual al avanzar, retroceder o recargar.

## Cómo trabajar

1. **Antes de escribir nada**, aclara con el usuario qué se quiere contar, a quién, cuánto dura y qué estética quiere. La plantilla no trae estética a propósito: se decide en cada presentación. Si hay material de partida (un libro, unos apuntes), es la fuente: léelo.
2. **Propón el hilo** escena a escena en la conversación, con una frase por beat, y espera su visto bueno antes de construir.
3. **Copia la plantilla** de `assets/plantilla/` a la carpeta de la presentación y borra la escena de ejemplo.
4. **Escribe `tema.css`** con la estética elegida. El que viene es provisional. `base.css` necesita las variables que hay al principio de `tema.css`.
5. **Construye de escena en escena** y comprueba cada una con capturas antes de darla por hecha.
6. **Mantén el discurso al día.** Si hay un guion aparte, debe decir lo mismo que la pantalla.

## Criterios

- **Pantalla limpia.** En pantalla, el dibujo y los datos. La explicación va en las notas del presentador: un párrafo de apoyo compite con quien habla. Si dudas si un texto hace falta, va a la nota.
- **Transformaciones, no cambios secos.** Conecta un beat con el siguiente: la figura que crece, la pieza que vuela a su sitio, el dibujo de antes que se abre para dejar entrar algo nuevo. Reutiliza el mismo ejemplo y el mismo dibujo a lo largo de la charla: el público ya los conoce y solo tiene que atender a lo nuevo.
- **Sin resúmenes que repitan.** Si algo ya se ha visto, no hace falta otra diapositiva que lo cuente.
- **Concepto antes que técnica.** El objetivo es que se entienda, no que se pueda reproducir todo. El detalle fino, a la nota o a las preguntas.
- **No inventes datos.** Cada número sale de una fuente que hayas leído o de una ejecución real. Lo inventado para explicar se marca en pantalla (`class="ilustrativo"`). Mejor aún si los números los calcula la propia presentación en el navegador.
- **Lo que se quita, se aparca.** `data-fuera` en la `<section>` la saca sin borrarla. Pregunta si se borra o se aparca.
- **Los tiempos los decide el usuario.** Si te pide una estimación: palabras de las notas a 130 por minuto, más 5–8 segundos por beat. Avisa de que las notas suelen quedarse cortas respecto a lo hablado.

## Referencia del HTML

Cada escena es una `<section class="escena" data-id="…" data-titulo="…">`. Los beats empiezan en 1 y su número se calcula solo.

```html
<p data-in="3">aparece en el beat 3</p>
<p data-in="2" data-out="5">visible en los beats 2, 3 y 4</p>
<div data-on="4:resaltado">tiene la clase desde el beat 4 EN ADELANTE</div>
<div data-on="2-2:abierta">tiene la clase solo en el beat 2</div>
<div data-on="2-3:a 4-4:b">varias reglas</div>
<pre class="codigo" data-foco="2:1-3 4:5">…</pre>  <!-- resalta líneas por beat -->
<aside class="nota" data-beat="2">qué decir en el beat 2</aside>
```

- `data-on="1:clase"` significa **desde el beat 1 para siempre**. Para un solo beat, escribe `1-1:clase`. Es el error más fácil de cometer.
- Las piezas que ocupan el mismo sitio van dentro de `<div class="pila">`.
- Si añades un beat en medio, renumera todo lo posterior: `data-in`, `data-out`, `data-on`, las notas y los `ctx.beat` de `escenas.js`.
- Pon una nota en cada beat: `recorrer.mjs` avisa de los que no la tienen.
- Las cajas de contenido llevan `class="panel"`, aunque el tema las pinte de otra forma. Así `recorrer.mjs` detecta lo que se sale de ellas.
- Si algo se sale del escenario a propósito, márcalo con `data-sale`.

**Movimiento.** Lo más sencillo es CSS: una transición sobre `transform` activada por una clase de `data-on`. Para lo demás está el gancho en `escenas.js`:

```js
Charla.escena("id-de-la-escena", async (ctx) => {
  // ctx = { el, beat, anterior, animar, vigente() }
  if (!ctx.animar) { /* pintar el estado final, sin transición */ return; }
  // animar, comprobando ctx.vigente() después de cada espera
});
```

Con `ctx.animar` en `false` hay que dejar el estado final: ocurre al saltar, al ir hacia atrás y en las capturas. Para lo aleatorio usa `Charla.azar(semilla)`, y `Charla.esperar(ms)` para las pausas.

Teclas: → siguiente · ← anterior · 1–9 escena · O vista general · P presentador · F pantalla completa · B negro. Con `?captura=1` no hay transiciones.

## Trampas conocidas

- **`.pila` mide el 100 % de su contenedor.** Dentro de una pieza posicionada se sale o empuja lo de abajo. Para apilar piezas que solo midan lo que su contenido, usa `.apila`.
- **Tablas con filas que aparecen por beats.** Con `border-collapse: collapse`, los bordes de las filas ocultas se siguen viendo. Usa `border-collapse: separate; border-spacing: 0`.
- **Piezas absolutas dentro de un grid o un flex se estiran.** Si un título o una caja ocupa más de lo que debe, dale `width: max-content; height: max-content; align-self: start; justify-self: start`.
- **Título que empieza centrado y luego sube.** Anima solo el paso a su sitio (`.titular:not(.centro) { transition: … }`); si no, al llegar al beat se ve viajar hasta el centro.
- **Resaltado de código.** `motor.js` reconoce palabras clave de JavaScript, Python, C/C++ y PHP, comentarios de una línea, cadenas, números y `$variables`. Los comentarios de varias líneas no se colorean. Si el lenguaje es otro, añade sus palabras a `PALABRAS`.
- **Movimiento reducido.** El motor respeta `prefers-reduced-motion` del sistema. Si se proyecta desde un equipo con esa opción activada y se quieren ver las animaciones, quita esa comprobación de `motor.js`.
- **Publicar en la web.** Si la presentación no debe aparecer en buscadores, añade `<meta name="robots" content="noindex, nofollow">` a `index.html` y a `presentador.html`.

## Comprobar

Desde la carpeta de la presentación (necesita `google-chrome`, Node ≥ 21 y, para la hoja de contactos, Python con Pillow):

```bash
bash herramientas/capturar.sh /tmp/capturas 2.1 2.2                         # capturas de beats
python3 herramientas/hoja-contactos.py /tmp/capturas /tmp/hoja.png 2.1 2.2  # varias en una imagen
node --experimental-websocket herramientas/recorrer.mjs /tmp/perfil         # recorrido completo
node --experimental-websocket herramientas/fotogramas.mjs /tmp/perfil /tmp/fotos 2.1:600   # animación a mitad
```

`recorrer.mjs` cuenta los beats, prueba el presentador y lista errores, beats sin nota y lo que se sale. Mira siempre las capturas: el recorrido no ve solapes entre piezas, como un bocadillo que tapa un texto. Revisa también el borde inferior: lo que más se corta son las ventanas altas.

Al terminar, deja un `README.md` corto en la carpeta con cómo abrirla y, si hay decisiones que recordar, un `CLAUDE.md` para retomarla en otra conversación.
