/* ==========================================================================
   Lo que se genera por código y las animaciones a medida de cada escena.
   Lo aleatorio, con semilla (Charla.azar): cada carga dibuja exactamente lo mismo.
   ========================================================================== */

(function () {
  "use strict";

  // Se llama cada vez que se pinta la escena con ese data-id.
  // Si ctx.animar es false (se ha saltado, o es una captura), hay que dejar el estado
  // final sin transición. En una animación larga, comprobar ctx.vigente() tras cada espera.
  Charla.escena("ejemplo", async (ctx) => {
    const cuenta = ctx.el.querySelector("#cuenta");
    if (!cuenta) return;
    if (ctx.beat !== 3 || !ctx.animar) { cuenta.textContent = ctx.beat >= 3 ? "10" : "0"; return; }
    for (let n = 1; n <= 10; n++) {
      await Charla.esperar(120);
      if (!ctx.vigente()) return;
      cuenta.textContent = n;
    }
  });
})();
