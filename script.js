(function(){
  // ---- Tunable motion config — adjust these to retime the feel ----
  var MOTION = {
    lenis:{
      duration:1.6,           // higher = longer, floatier inertia glide
      wheelMultiplier:1        // scroll-speed multiplier for the wheel
    },
    gate:{
      scrub:0.35,              // scrub lag (seconds) between scroll and zoom; 0 = instant
      // On narrow viewports the towers cutout already fills most of the
      // frame, so the same 9x scale used on desktop overshoots into an
      // unrecognizable close-up blur almost immediately — scale the max
      // zoom down for small screens so the effect stays legible.
      zoomTo:window.innerWidth < 640 ? 2.2 : (window.innerWidth < 880 ? 3 : 4),
      bgZoomTo:1.15            // how far the background sky/mountain layer scales up — much less, so it reads as staying distant
    },
    reveal:{
      duration:0.9,
      start:'top 88%',         // when a section starts revealing, relative to viewport
      ease:'power3.out'
    }
  };

  var header = document.getElementById('site-header');
  var hero = document.querySelector('.hero');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = window.gsap && window.ScrollTrigger;

  if(hasGSAP && !reduced){
    gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, window.SplitText);
    hero.classList.add('js-driven');
    gsap.set('.hero-sub, .hero-actions', { opacity:0, y:20 });

    // Real Lenis smooth/inertia scroll, driven by GSAP's ticker — this is
    // the standard Lenis+GSAP integration: Lenis intercepts the wheel and
    // eases the scroll position, and on every GSAP tick we push time into
    // Lenis and tell ScrollTrigger to re-sync against Lenis's own scroll
    // value instead of the raw (jumpy) native one.
    var lenis = null;
    if(window.Lenis){
      lenis = new Lenis({
        duration:MOTION.lenis.duration,
        easing:function(t){ return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
        smoothWheel:true,
        wheelMultiplier:MOTION.lenis.wheelMultiplier
      });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function(time){ lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    gsap.ticker.add(function(){
      var y = lenis ? lenis.scroll : window.scrollY;
      header.classList.toggle('scrolled', y > 40);
      ScrollTrigger.update();
    });

    // Gate hero: two independent layers. The background (#gateBg — the
    // full photo: sky, mountain, water) stays almost still, drifting only
    // very slightly. The foreground (#gateShot — the towers-only cutout,
    // transparent gap) scales up and moves toward the viewer as you
    // scroll through the hero's runway — real two-plane parallax, so it
    // reads as physically walking through the gate toward a fixed
    // distant mountain rather than one flat photo scaling as a unit.
    // Text fades out early so it doesn't fight the motion; the CTA/nav
    // stay outside both layers entirely and never move.
    gsap.timeline({
      scrollTrigger:{
        trigger:'#top',
        start:'top top',
        end:'+=70%',
        scrub:MOTION.gate.scrub
      }
    })
      .to('#gateShot', { scale:MOTION.gate.zoomTo, ease:'none' }, 0)
      .to('#gateBg', { scale:MOTION.gate.bgZoomTo, yPercent:-3, ease:'none' }, 0)
      .to('#gateDusk', { opacity:0.8, ease:'power1.in' }, 0)
      // Focus pull: the distant sky softens slightly as you pass through,
      // like a lens racking focus onto the foreground gate.
      .to('#gatePhoto', { filter:'saturate(.72) brightness(.96) contrast(.97) blur(2.5px)', ease:'none' }, 0)
      .to('.scroll-cue', { opacity:0, ease:'none' }, 0);

    // The flanking headline gets its own faster, eased fade — it
    // finishes dissolving within the first quarter of the zoom instead
    // of lingering (faded but still visible) across the whole sequence,
    // so it reads as a clean, smooth exit rather than a slow drag.
    gsap.to('.gate-copy-left', { x:-70, ease:'none', scrollTrigger:{ trigger:'#top', start:'top top', end:'+=18%', scrub:0.4 } });
    gsap.to('.gate-copy-right', { x:70, ease:'none', scrollTrigger:{ trigger:'#top', start:'top top', end:'+=18%', scrub:0.4 } });
    gsap.to('.gate-copy', {
      opacity:0, y:-24, ease:'power2.out',
      scrollTrigger:{
        trigger:'#top',
        start:'top top',
        end:'+=18%',
        scrub:0.4
      }
    });

    // Headline reveal: each word rises out of its own mask in a
    // staggered wave on load, flanking the full-view gate photo, plus
    // the intro copy/actions fade up beneath it.
    gsap.timeline({ delay:0.3 })
      .to('.gate-copy-left .split-word, .gate-copy-right .split-word', { y:0, duration:0.9, stagger:0.06, ease:'power4.out' }, 0)
      .to('.hero-sub', { opacity:1, y:0, duration:0.8, ease:'power3.out' }, 0.5)
      .to('.hero-actions', { opacity:1, y:0, duration:0.8, ease:'power3.out' }, 0.65);

    // Section headings: SplitText line masks, each line rising out of its
    // own mask as the heading enters. Section-head h2s drop the clip-path
    // .reveal so the two effects don't fight; about/cta h2s sit inside a
    // .reveal parent, which is fine.
    document.querySelectorAll('.section-head h2.reveal').forEach(function(h){ h.classList.remove('reveal'); });
    if(window.SplitText){
      gsap.utils.toArray('.section-head h2, .about-grid h2, .cta-grid h2').forEach(function(h){
        SplitText.create(h, {
          type:'lines', mask:'lines', linesClass:'split-mask', autoSplit:true,
          onSplit:function(self){
            return gsap.from(self.lines, {
              yPercent:110, duration:1, ease:'power4.out', stagger:0.12,
              scrollTrigger:{ trigger:h, start:'top 88%', toggleActions:'play none none reverse' }
            });
          }
        });
      });
    }

    // Depth parallax: the mountain backdrop drifts slower than the page,
    // and the destination chips / testimonial cards float at different
    // speeds so the grid has layers instead of moving as one sheet.
    gsap.fromTo('.mountain-photo', { yPercent:-6 }, {
      yPercent:6, ease:'none',
      scrollTrigger:{ trigger:'#mountainReveal', start:'top bottom', end:'bottom top', scrub:true }
    });
    if(window.innerWidth > 880){
      gsap.utils.toArray('.dest-chip').forEach(function(chip, i){
        gsap.to(chip, {
          yPercent:(i % 3 - 1) * 28, ease:'none',
          scrollTrigger:{ trigger:'#destinations', start:'top bottom', end:'bottom top', scrub:true }
        });
      });
      gsap.utils.toArray('.testi-card').forEach(function(card, i){
        gsap.to(card, {
          yPercent:(1 - i) * -6, ease:'none',
          scrollTrigger:{ trigger:card.parentNode, start:'top bottom', end:'bottom top', scrub:true }
        });
      });
    }

    // Section reveals: clip-path unmask scrubbed against each section's
    // own entry into the viewport (the "section clip" pattern), not a
    // one-shot fade — so the curtain draws back as you scroll.
    gsap.utils.toArray('.reveal').forEach(function(el, i){
      gsap.fromTo(el,
        { opacity:0, clipPath:'inset(0 0 100% 0)' },
        {
          opacity:1, clipPath:'inset(0 0 0% 0)',
          duration:MOTION.reveal.duration, ease:MOTION.reveal.ease,
          scrollTrigger:{
            trigger:el,
            start:MOTION.reveal.start,
            toggleActions:'play none none reverse'
          }
        }
      );
    });

    // Scroll-progressive line sweep: each word is wrapped in a span,
    // then consecutive words are grouped into their real wrapped visual
    // line (by shared offsetTop — line breaks aren't knowable from the
    // markup alone). Each line group gets a horizontal gradient
    // background clipped to its own text (background-clip:text) that
    // sweeps left-to-right as a CSS custom property is scrubbed by
    // scroll — a single gradient sweep is far more robust than
    // duplicating/positioning text nodes by hand.
    function wireScrollBrighten(id, dimColor){
      var el = document.getElementById(id);
      if(!el) return;
      var brightColor = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
      var words = el.textContent.split(/(\s+)/).filter(function(w){ return w.length; });
      el.innerHTML = words.map(function(w){
        return /\s/.test(w) ? w : '<span class="word">' + w + '</span>';
      }).join('');

      function groupLines(){
        el.querySelectorAll('.line-sweep').forEach(function(wrap){
          while(wrap.firstChild) wrap.parentNode.insertBefore(wrap.firstChild, wrap);
          wrap.remove();
        });
        var wordEls = Array.prototype.slice.call(el.querySelectorAll('.word'));
        var lines = [];
        var currentTop = null;
        wordEls.forEach(function(word){
          var top = word.offsetTop;
          if(currentTop === null || Math.abs(top - currentTop) > 2){
            lines.push([]);
            currentTop = top;
          }
          lines[lines.length - 1].push(word);
        });
        lines.forEach(function(lineWords){
          var wrap = document.createElement('span');
          wrap.className = 'line-sweep';
          lineWords[0].parentNode.insertBefore(wrap, lineWords[0]);
          // Moving .word spans into the wrapper leaves the original
          // whitespace text nodes between them behind (they're siblings,
          // not children, of each word) — insert an explicit space
          // between words here instead of relying on those orphaned nodes.
          lineWords.forEach(function(w, i){
            if(i > 0) wrap.appendChild(document.createTextNode(' '));
            wrap.appendChild(w);
          });
        });
        return el.querySelectorAll('.line-sweep');
      }

      // Line grouping depends on final layout (fonts/widths settled),
      // so do it after load, then wire each line's own scrubbed sweep.
      window.addEventListener('load', function(){
        var lineEls = groupLines();
        lineEls.forEach(function(line){
          line.style.backgroundImage = 'linear-gradient(90deg, ' + brightColor + ' 0%, ' + brightColor + ' 0%, ' + dimColor + ' 0%, ' + dimColor + ' 100%)';
          line.style.webkitBackgroundClip = 'text';
          line.style.backgroundClip = 'text';
          line.style.color = 'transparent';
          line.style.setProperty('--sweep', '0%');
          gsap.to(line, {
            '--sweep':'100%', ease:'none',
            onUpdate:function(){
              var p = parseFloat(line.style.getPropertyValue('--sweep'));
              line.style.backgroundImage = 'linear-gradient(90deg, ' + brightColor + ' 0%, ' + brightColor + ' ' + p + '%, ' + dimColor + ' ' + p + '%, ' + dimColor + ' 100%)';
            },
            scrollTrigger:{
              trigger:line,
              start:'top 70%',
              end:'top 30%',
              scrub:true
            }
          });
        });
        ScrollTrigger.refresh();
      });
    }
    wireScrollBrighten('aboutBrighten', 'rgba(20,16,12,0.4)');
    wireScrollBrighten('statBrightenText', 'rgba(20,16,12,0.32)');
    // Word positions depend on final layout (fonts, image sizes) which
    // can still be settling when the triggers above are created —
    // refresh once everything has loaded so each word's screen-center
    // crossing point is measured correctly.
    window.addEventListener('load', function(){ ScrollTrigger.refresh(); });

    // Feature grid: a soft fade-and-rise entrance for the brand block
    // and the four feature cards, staggered gently so the whole group
    // settles into place rather than appearing all at once.
    gsap.set('.feature-brand, .feature-card', { opacity:0, y:18 });
    gsap.to('.feature-brand, .feature-card', {
      opacity:1, y:0, duration:1.1, ease:'power2.out', stagger:0.12,
      scrollTrigger:{
        trigger:'.feature-grid',
        start:'top 85%',
        toggleActions:'play none none reverse'
      }
    });

    // Journey thread: the spine's fill height and travelling dot are
    // scrubbed against how far you've scrolled through the whole story
    // block (About → Contact) as one continuous distance, so the line
    // grows and the dot moves in lockstep with the page rather than
    // per-section — it's the throughline connecting every section below.
    var story = document.getElementById('story');
    if(story){
      gsap.to('#journeyThread', {
        height:'100%', ease:'none',
        scrollTrigger:{ trigger:story, start:'top 40%', end:'bottom 60%', scrub:true }
      });
      gsap.to('#journeyDot', {
        top:'100%', ease:'none',
        scrollTrigger:{ trigger:story, start:'top 40%', end:'bottom 60%', scrub:true }
      });
    }

    // Experience cards tilt in from a slight 3D pitch rather than a flat
    // clip reveal, staggered by their position in the grid.
    gsap.set('.exp-card', { transformPerspective:800 });
    gsap.from('.exp-card', {
      rotateX:-35, y:26, opacity:0, duration:0.7, ease:'power2.out',
      stagger:{ each:0.08, grid:'auto', from:'start' },
      scrollTrigger:{ trigger:'#experiences', start:'top 75%', toggleActions:'play none none reverse' }
    });

    // Destination chips "land" one by one with a small overshoot, like
    // pins dropping onto a map, staggered by index.
    gsap.from('.dest-chip', {
      y:-16, opacity:0, rotateX:40, duration:0.5, ease:'back.out(2.2)',
      stagger:0.045,
      scrollTrigger:{ trigger:'#destinations', start:'top 75%', toggleActions:'play none none reverse' }
    });

    // Services: a thin progress line fills down the row list in sync
    // with scroll through the section, and each row's tag slides in
    // from the opposite side of its heading — a small piece of route
    // continuing through the service list.
    gsap.to('.service-progress', {
      height:'100%', ease:'none',
      scrollTrigger:{ trigger:'#services', start:'top 70%', end:'bottom 70%', scrub:true }
    });
    gsap.utils.toArray('.service-item').forEach(function(item){
      var tag = item.querySelector('.tag');
      gsap.from(tag, {
        x:24, opacity:0, duration:0.6, ease:'power2.out',
        scrollTrigger:{ trigger:item, start:'top 85%', toggleActions:'play none none reverse' }
      });
    });

    // Testimonials: the quote mark scales in first per card, then the
    // quote text and citation follow — staggered across the three cards.
    gsap.utils.toArray('.testi-card').forEach(function(card){
      gsap.timeline({
        scrollTrigger:{ trigger:card, start:'top 82%', toggleActions:'play none none reverse' }
      })
        .from(card, { opacity:0, y:24, duration:0.5, ease:'power2.out' })
        .from(card, { '--quote-mark-scale':0.2, duration:0.01 }, 0)
        .to(card, { '--quote-mark-scale':1, duration:0.4, ease:'back.out(3)' }, 0.1)
        .from(card.querySelectorAll('blockquote, cite'), { opacity:0, y:10, duration:0.5, stagger:0.1, ease:'power2.out' }, 0.15);
    });
  } else {
    document.querySelectorAll('.reveal').forEach(function(el){ el.classList.add('in'); });
    if(header){
      window.addEventListener('scroll', function(){
        header.classList.toggle('scrolled', window.scrollY > 40);
      }, { passive:true });
    }
  }

  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if(toggle){
    toggle.addEventListener('click', function(){
      var open = links.style.display === 'flex';
      links.style.display = open ? 'none' : 'flex';
      links.style.cssText += 'position:fixed; top:64px; left:0; right:0; background:var(--ground); flex-direction:column; padding:1.5rem clamp(1.25rem,4vw,3rem); border-bottom:1px solid var(--line); gap:1.2rem; z-index:99;';
    });
  }

  var form = document.querySelector('#contact form');
  if(form){
    form.addEventListener('submit', function(event){
      event.preventDefault();
      var submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      // Placeholder submit — wire this up to a real endpoint (email service,
      // form backend, or API) before going live.
      window.setTimeout(function(){
        form.reset();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Start Your Journey';
        var note = form.querySelector('.form-note');
        if(note) note.textContent = "Thanks — we've received your request and will be in touch shortly.";
      }, 600);
    });
  }
})();
