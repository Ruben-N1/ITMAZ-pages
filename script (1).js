(function(){
  "use strict";
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVGNS = "http://www.w3.org/2000/svg";

  function el(tag, attrs){
    var e = document.createElementNS(SVGNS, tag);
    for(var k in attrs){ e.setAttribute(k, attrs[k]); }
    return e;
  }

  /* ---------------------------------------------------------
     BACKGROUND VIDEO — fixed behind the hero; opaque sections
     below cover it as the page scrolls. Handles autoplay
     rejection and reduced-motion preference.
     --------------------------------------------------------- */
  function initBgVideo(){
    var video = document.getElementById("bgVideo");
    if(!video) return;

    if(reducedMotion){
      video.pause();
      video.removeAttribute("autoplay");
      return;
    }
    var playPromise = video.play();
    if(playPromise && playPromise.catch){
      playPromise.catch(function(){
        // autoplay blocked (rare with muted+playsinline, but just in case):
        // the poster frame stays visible, which still reads fine.
      });
    }
  }

  // deterministic PRNG so generative graphics are stable across reloads
  function mulberry32(a){
    return function(){
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---------------------------------------------------------
     SPINE — vertical circuit-to-vine hybrid divider
     --------------------------------------------------------- */
  function buildSpine(svgEl, opts){
    if(!svgEl) return;
    var vb = svgEl.getAttribute("viewBox").split(" ").map(Number);
    var W = vb[2], H = vb[3];
    var midX = W/2;

    var pathMain = "M"+midX+",0 ";
    var segments = opts.segments || 10;
    var x = midX;
    for(var i=1;i<=segments;i++){
      var y = (H/segments)*i;
      var jitter = (i % 2 === 0 ? 1 : -1) * (opts.jitter||14);
      var nx = midX + jitter * (i/segments);
      pathMain += "L"+nx+","+y+" ";
      x = nx;
    }
    var mainPath = el("path", {d:pathMain, stroke:opts.color1, "stroke-width":"2", fill:"none", opacity:"0.7"});
    svgEl.appendChild(mainPath);

    // circuit nodes / branches (top half) fading into organic leaves (bottom half)
    var rng = mulberry32(opts.seed || 3);
    for(var i=0;i<opts.nodes;i++){
      var t = i/opts.nodes;
      var y = t*H;
      var organic = t > (opts.split!==undefined?opts.split:0.5);
      var side = rng() > 0.5 ? 1 : -1;
      var baseX = midX;
      // approximate x along main path
      var segIdx = Math.min(segments-1, Math.floor(t*segments));
      var jitter = (segIdx % 2 === 0 ? 1 : -1) * (opts.jitter||14);
      baseX = midX + jitter * ((segIdx+1)/segments);

      if(organic){
        // little leaf/branch
        var len = 10+rng()*16;
        var bx = baseX + side*len;
        var branch = el("path", {
          d:"M"+baseX+","+y+" Q"+(baseX+side*len*0.6)+","+(y-6)+" "+bx+","+(y+ (rng()-0.5)*10),
          stroke:opts.color2, "stroke-width":"1.6", fill:"none", opacity:"0.65"
        });
        svgEl.appendChild(branch);
        var leaf = el("ellipse", {cx:bx, cy:y+(rng()-0.5)*10, rx:4.5, ry:2.2, fill:opts.color2, opacity:"0.55",
          transform:"rotate("+(side*40)+" "+bx+" "+y+")"});
        svgEl.appendChild(leaf);
      } else {
        // circuit branch + node
        var len2 = 12+rng()*18;
        var bx2 = baseX + side*len2;
        var branch2 = el("path", {
          d:"M"+baseX+","+y+" L"+(baseX+side*len2*0.5)+","+y+" L"+bx2+","+(y+ (rng()>0.5?8:-8)),
          stroke:opts.color1, "stroke-width":"1.4", fill:"none", opacity:"0.6"
        });
        svgEl.appendChild(branch2);
        var node = el("circle", {cx:bx2, cy:y+(rng()>0.5?8:-8), r:2.4, fill:opts.color1, opacity:"0.85"});
        svgEl.appendChild(node);
      }
    }

    // node glow at the very top and bottom
    var topNode = el("circle", {cx:midX, cy:2, r:3.5, fill:opts.color1});
    var botNode = el("circle", {cx:x, cy:H-2, r:3.5, fill:opts.color2});
    svgEl.appendChild(topNode);
    svgEl.appendChild(botNode);
  }

  /* ---------------------------------------------------------
     TYPED HERO LINE
     --------------------------------------------------------- */
  function typeLine(){
    var target = document.getElementById("typedLine");
    if(!target) return;
    var text = "cargando la diferencia entre estas dos palabras...";
    if(reducedMotion){ target.textContent = text; return; }
    var i = 0;
    (function step(){
      if(i <= text.length){
        target.textContent = text.slice(0, i);
        i++;
        setTimeout(step, 32);
      }
    })();
  }

  /* ---------------------------------------------------------
     SCROLL REVEAL
     --------------------------------------------------------- */
  function initReveal(){
    var targets = document.querySelectorAll(
      ".section__head, .dilema__card, .lead, .protocol, .terminal, .uso__card, .uso__note, .sintesis__icon, .sintesis__text"
    );
    targets.forEach(function(t){ t.classList.add("reveal"); });

    if(reducedMotion || !("IntersectionObserver" in window)){
      targets.forEach(function(t){ t.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, {threshold:0.15, rootMargin:"0px 0px -40px 0px"});
    targets.forEach(function(t){ io.observe(t); });
  }

  document.addEventListener("DOMContentLoaded", function(){
    initBgVideo();
    buildSpine(document.getElementById("spineSvg"), {
      color1:"#ff3ea5", color2:"#5cffa6", nodes:22, split:0.55, seed:11, segments:12, jitter:16
    });
    buildSpine(document.getElementById("spineSvgMid"), {
      color1:"#ff3ea5", color2:"#5cffa6", nodes:12, split:0.3, seed:23, segments:8, jitter:12
    });
    typeLine();
    initReveal();
  });
})();
