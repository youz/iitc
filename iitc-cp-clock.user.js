// ==UserScript==
// @id             iitc-plugin-cp-clock@youz
// @name           IITC plugin: CheckPoint Clock
// @category       Info
// @version        0.1.1.20170129.0000
// @namespace      https://github.com/youz/iitc
// @author         youz
// @downloadURL    https://youz.github.io/iitc/iitc-cp-clock.user.js
// @description    Display a clock showing times for the next/previous checkpoint.
// @include        https://*.ingress.com/intel*
// @include        http://*.ingress.com/intel*
// @match          https://*.ingress.com/intel*
// @match          http://*.ingress.com/intel*
// @include        https://*.ingress.com/mission/*
// @include        http://*.ingress.com/mission/*
// @match          https://*.ingress.com/mission/*
// @match          http://*.ingress.com/mission/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
if(typeof window.plugin !== 'function') window.plugin = function() {};

// PLUGIN START ////////////////////////////////////////////////////////
window.plugin.cpClock = function() {};
var DEFAULT_OPTION = {
    'width': 228,
    'top': 0,
    'left': 0,
    'startup': false,
    'countdown': 30,
    'color': {
        'face': 'rgb(206, 255, 0)',
        'elapsed': 'rgba(220, 190, 128, 0.6)',
        'remaining': 'rgba(96, 190, 220, 0.8)',
        'countdown': 'rgba(255, 0, 0, 0.9)'
    }
};

var CHECKPOINT = 5*60*60; //5 hours per checkpoint
var CYCLE = 7*25*60*60;   //7 25 hour 'days' per cycle

window.plugin.cpClock.option = {};

window.plugin.cpClock.loadOption = function () {
    var dataStr = localStorage['plugin-cp-clock'];
    if (dataStr === undefined) return;
    var data = JSON.parse(dataStr);
    window.plugin.cpClock.option = $.extend(true, {}, DEFAULT_OPTION, data);
};

window.plugin.cpClock.saveOption = function () {
    var e = $('.ui-dialog-cp-clock');
    window.plugin.cpClock.option.top = parseInt(e.css('top'));
    window.plugin.cpClock.option.left = parseInt(e.css('left'));
    localStorage.setItem('plugin-cp-clock', JSON.stringify(window.plugin.cpClock.option));
};

window.plugin.cpClock.showCPClockOption = function () {
    var backup = window.plugin.cpClock.option;
    var applyopt = function (opt) {
        window.plugin.cpClock.option = $.extend(true, {}, DEFAULT_OPTION, opt);
        $('.ui-dialog-cp-clock').css({'top':opt.top,'left':opt.left});
        window.plugin.cpClock.dialog.dialog('close');
        window.plugin.cpClock.showCPClock();
    };
    var parseopt = function () {
        var o = {};
        try {
            o = JSON.parse($('#cp_clock_opt_json').val());
        } catch (e) {
            alert("Parse Error");
            return null;
        }
        return o;
    };
    dialog({
        html: '<div align="center"><textarea id="cp_clock_opt_json" cols="44" rows="12">'
              + JSON.stringify(window.plugin.cpClock.option, null, 2)
              + '</textarea>',
        dialogClass: 'ui-dialog-cp-clock-option',
        id: 'cp_clock_opt',
        title: 'CPClock Options',
        modal: true,
        width: 360,
        buttons: {
            'Apply': function() {
                var o = parseopt();
                if (o) applyopt(o);
            },
            'Reset': function () {
                $('#cp_clock_opt_json').val(JSON.stringify(backup, null, 2));
                applyopt(backup);
            },
            'Default': function () {
                $('#cp_clock_opt_json').val(JSON.stringify(DEFAULT_OPTION, null, 2));
                applyopt(DEFAULT_OPTION);
            }
        },
        closeCallback: function () {
            var o = parseopt();
            if (o) applyopt(o);
            window.plugin.cpClock.saveOption();
        }
    });
};

window.plugin.cpClock.AnalogClock = function (canvas, colors, countdown) {
    this.canvas = canvas;
    this.colors = colors;
    this.countdown = Math.min(countdown, 60);
    var w = this.canvas.width;
    var h = this.canvas.height;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.translate(w / 2, h / 2);
    this.ctx.scale(w / 120, h / 120);
    this.ctx.rotate(-Math.PI/2);
    this.ctx.lineCap = 'butt';
};

window.plugin.cpClock.AnalogClock.prototype = {
  drawFace: function(color) {
      var x = this.ctx;
      x.lineWidth = 3;
      x.strokeStyle = color;
      x.moveTo(0, 0);
      x.beginPath();
      x.arc(0, 0, 49, 0, Math.PI * 2, false);
      x.stroke();
      x.save();
      for (var i = 0; i < 60; i++) {
          x.lineWidth = (i % 5 == 0 ? 2 : 1);
          x.beginPath();
          x.moveTo((i % 5 == 0 ? 40 : 45), 0);
          x.lineTo(50, 0);
          x.stroke();
          x.rotate(Math.PI/30);
      }
      x.restore();
  },
  drawHand: function (w, l, a, color) {
      var x = this.ctx;
      x.save();
      x.rotate(a);
      x.lineWidth = w;
      x.strokeStyle = color;
      x.beginPath();
      x.moveTo(0, 0);
      x.lineTo(l, 0);
      x.stroke();
      x.restore();
  },
  fillArc: function (r, from, to, color) {
      var x = this.ctx;
      x.beginPath();
      x.moveTo(0, 0);
      x.arc(0, 0, r, from, to);
      x.closePath();
      x.fillStyle = color;
      x.fill();
  },
  update: function (now, cpstart, cpend) {
      this.ctx.clearRect(-50, -50, 100, 100);
      var h = (now.getHours() + now.getMinutes()/60) * Math.PI / 6;
      this.fillArc(48, cpstart.getHours() * Math.PI / 6, h, this.colors.elapsed);
      this.fillArc(48, h, cpend.getHours() * Math.PI / 6, this.colors.remaining);
      if ((cpend - now) / 1000 <= this.countdown) {
          this.fillArc(48, now.getSeconds() * Math.PI / 30, 2 * Math.PI, this.colors.countdown);
      }
      this.drawFace(this.colors.face);
      this.drawHand(3, 30, h, this.colors.face);
      this.drawHand(2, 40, (now.getMinutes() + now.getSeconds()/60) * Math.PI / 30, this.colors.face);
      this.drawHand(1, 40, now.getSeconds() * Math.PI / 30, this.colors.face);
  },
};

window.plugin.cpClock.update = function() {
    var now = new Date();
    var cycleStart = Math.floor(now / (CYCLE*1000)) * (CYCLE*1000);
    var cycleEnd = cycleStart + CYCLE*1000;
    var cpStart = Math.floor(now / (CHECKPOINT*1000)) * (CHECKPOINT*1000);
    var cpEnd = cpStart + CHECKPOINT*1000;
    window.plugin.cpClock.clock.update(now, new Date(cpStart), new Date(cpEnd));
    $('#cp_clock_cp_next').html(unixTimeToString(cpEnd, true).replace(/:00$/,''));
    $('#cp_clock_cp_rem').html(new Date(cpEnd - now + 1000).toLocaleTimeString('en-GB',{ timeZone: 'UTC',}));
    $('#cp_clock_cycle_start').html(unixTimeToString(cycleStart, true).replace(/:00$/,''));
    $('#cp_clock_cycle_end').html(unixTimeToString(cycleEnd, true).replace(/:00$/,''));
};

window.plugin.cpClock.showCPClock = function () {
    if (typeof window.plugin.cpClock.dialog !==  'undefined' && window.plugin.cpClock.dialog !== null) {
        return;
    }
    var o = window.plugin.cpClock.option;
    var html = '<div id="cp_clock_panel">' +
               '<div align="center"><canvas id="cp_clock_canvas" width="' +
               (o.width - 40) + '" height="' + (o.width - 40) + '"></canvas></div>' +
               '<div><table style="font-size: 12px; color: rgb(255, 206, 0)">' +
               '<tr><td>Next CP</td><td id="cp_clock_cp_next"></td></tr>' +
               '<tr><td>Remaining</td><td id="cp_clock_cp_rem"></td></tr>' +
               '<tr><td>Cycle start</td><td id="cp_clock_cycle_start"></td></tr>' +
               '<tr><td>Cycle end</td><td id="cp_clock_cycle_end"></td></tr>' +
               '</table></div></div>';
    window.plugin.cpClock.dialog = dialog({
      html: html,
      dialogClass: 'ui-dialog-cp-clock',
      title: 'CheckPoint',
      id: 'cp_clock_dialog',
      width: o.width,
      buttons: {
          'Option': window.plugin.cpClock.showCPClockOption
      },
      closeCallback: function () {
          clearInterval(window.plugin.cpClock.timer);
          window.plugin.cpClock.clock = window.plugin.cpClock.timer = null;
          window.plugin.cpClock.dialog = null;
      }
    });
    $('.ui-dialog-cp-clock').css({'top':o.top,'left':o.left});
    window.plugin.cpClock.dialog.on('dialogdragstop', function () {
        window.plugin.cpClock.saveOption();
    });
    $('.ui-dialog-cp-clock').find('.ui-dialog-titlebar').css('min-width', 150);
    window.plugin.cpClock.clock = new window.plugin.cpClock.AnalogClock($('#cp_clock_canvas')[0], o.color, o.countdown);
    window.plugin.cpClock.update();
    window.plugin.cpClock.timer = setInterval(window.plugin.cpClock.update, 1000);
};

window.plugin.cpClock.setup  = function() {
    window.plugin.cpClock.loadOption();
    $('#toolbox').append('<a onclick="window.plugin.cpClock.showCPClock()">CP clock</a>');
    if (window.plugin.cpClock.option.startup) {
        window.plugin.cpClock.showCPClock();
    }
};

var setup =  window.plugin.cpClock.setup;

// PLUGIN END //////////////////////////////////////////////////////////

setup.info = plugin_info; //add the script info data to the function as a property
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);
