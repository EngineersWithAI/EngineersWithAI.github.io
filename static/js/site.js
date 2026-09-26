/* Engineers with AI. JavaScript is used only for the menus, progress tracking, and the
   "On this page" highlight. Everything on the site can be read without it. */
(function () {
  "use strict";

  /* Menus: the header "Menu" button and the "Course menu" button on narrow screens. */
  var toggles = Array.prototype.slice.call(document.querySelectorAll(".menu-button, .course-menu-button"));

  function setOpen(button, open) {
    var target = document.getElementById(button.getAttribute("aria-controls"));
    if (!target) return;
    button.setAttribute("aria-expanded", open ? "true" : "false");
    target.classList.toggle("is-open", open);
  }

  toggles.forEach(function (button) {
    button.addEventListener("click", function () {
      setOpen(button, button.getAttribute("aria-expanded") !== "true");
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    toggles.forEach(function (button) {
      if (button.getAttribute("aria-expanded") !== "true") return;
      setOpen(button, false);
      if (button.offsetParent !== null) button.focus();
    });
  });

  /* Progress: "I've finished this module" checkboxes, saved in localStorage.
     Every storage access is wrapped, because private windows and blocked storage throw. */
  var KEY = "ewai-progress-v1";

  function readProgress() {
    try {
      var raw = window.localStorage.getItem(KEY);
      var data = raw ? JSON.parse(raw) : {};
      return data && typeof data === "object" ? data : {};
    } catch (error) {
      return null;
    }
  }

  function writeProgress(data) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      return false;
    }
  }

  function showMarks(data) {
    var items = document.querySelectorAll("[data-progress-id]");
    Array.prototype.forEach.call(items, function (item) {
      var slot = item.querySelector(".course-nav-text") || item;
      var mark = slot.querySelector(".done-mark");
      var done = Boolean(data[item.getAttribute("data-progress-id")]);
      if (done && !mark) {
        mark = document.createElement("span");
        mark.className = "done-mark";
        mark.innerHTML = '<span aria-hidden="true">✓</span><span class="visually-hidden"> (finished)</span>';
        slot.appendChild(mark);
      } else if (!done && mark) {
        mark.remove();
      }
    });
  }

  var progress = readProgress();
  if (progress) {
    showMarks(progress);
    var box = document.querySelector("[data-progress]");
    if (box) {
      var id = box.getAttribute("data-progress");
      var input = box.querySelector("input");
      input.checked = Boolean(progress[id]);
      box.hidden = false;
      input.addEventListener("change", function () {
        var latest = readProgress() || {};
        if (input.checked) {
          latest[id] = true;
        } else {
          delete latest[id];
        }
        if (writeProgress(latest)) {
          showMarks(latest);
        } else {
          input.checked = !input.checked;
        }
      });
    }
  }

  /* "On this page": mark the section currently at the top of the window. */
  var toc = document.querySelector(".toc");
  if (toc) {
    var links = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
    var targets = links.map(function (link) {
      return document.getElementById(decodeURIComponent(link.getAttribute("href").slice(1)));
    });
    var pending = false;

    var update = function () {
      pending = false;
      var current = -1;
      for (var i = 0; i < targets.length; i++) {
        if (targets[i] && targets[i].getBoundingClientRect().top <= 96) current = i;
      }
      var root = document.documentElement;
      if (window.scrollY > 0 && window.innerHeight + window.scrollY >= root.scrollHeight - 2) {
        current = targets.length - 1;
      }
      links.forEach(function (link, index) {
        if (index === current) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    };

    window.addEventListener("scroll", function () {
      if (!pending) {
        pending = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }
})();
