const gui   = require('nw.gui');


const TIMER_INTERVAL = 1000,
	  BUTTON_HEIGHT  = 81,
	  WINDOW_WIDTH   = 250,
	  BOTTOM_MARGIN  = 5;


var win = gui.Window.get();


var timers = new Array();

var system = new toggler_system();


document.addEventListener("DOMContentLoaded", function() {


	// figure out config file
	config_file = gui.App.argv;
	if (config_file.toString().substr(0,1) == "/") {
		config_file = config_file.toString();
	} else {
		config_file = process.env.PWD+'/'+config_file.toString();
	}

	console.log("config file is", config_file);


	// what to do when a state changes
	system.check_update = function(key) {


		let elen = document.querySelector(`#${key}`);

		if (system.data[key].check == undefined) return;


		elen.innerHTML(led(system.data[key].color) + system.data[key].text);


		// FIXME  I should probably do this better than I am.
		try {
			if (system.data[key].states[ system.data[key].state ].timer != undefined ||
				system.data[key].states[ system.data[key].state ].timer == true) {

				elen.insertAdjacentHTML('afterbegin', "<div class='time'>00:00:00</div>");

				timers[key] = setInterval(function() {

					var diff = (Date.now() - system.data[key].lastchange) / 1000;
					var ts = diff.toString().toHHMMSS();
					document.querySelector(`#${key} .time`).innerHTML(ts);

				}.bind(key), TIMER_INTERVAL);
			} else {
				clearInterval(timers[key]);
			}
		} catch (e) {
			console.log("timer catch", e.message);
		}


		if (system.data[key].state == 'broken') {
			elen.classList.add('broken');
		} else {
			elen.classList.remove('broken');
		}


	}.bind(system);


	// what to do when a change request finishes
	system.change_update = function(key) {
		console.log(key+' has finished changing');
		document.querySelector(`#${key}`).classList.remove('pressed');
	}
	

	// load the config, then draw stuff
	system.load_config(config_file, function(err, str) {
		if (err) {
			alert(str);
			process.exit(1);
		} else {
			draw_buttons();
		}

		if (system.title) document.title = system.title;
	});






});



function draw_buttons() {

	let main = document.querySelector("#main");

	main.innerHTML = "";

	var canvas        = '',
		window_height = 0;

	for (var key in system.data) {


		if (system.data[key].name) {
			canvas = '<button id="'+key+'">'+
					 system.data[key].name +
					 '</button>';
			main.insertAdjacentHTML('beforend', canvas);
			
			document.querySelector(`#${key}`).addEventListener("click", do_thing);
		} else {
			canvas = '<button id="'+key+'"></button>';
			main.insertAdjacentHTML('beforeend', canvas);
			document.querySelector(`#${key}`).addEventListener("click", do_thing);
		}

		

	}


	setTimeout(function() {

		window_height = (BUTTON_HEIGHT * Object.keys(system.data).length) + BOTTOM_MARGIN;
		console.log("size two", window_height);
		win.resizeTo(WINDOW_WIDTH, window_height);
		win.setResizable(false);
		
		setTimeout(function() {
			console.log("size one");
			win.show();
		}, 500);

	}, 500);

	

}



function do_thing() {
	let id = this.target.id;

	if (system.data[id].state != "broken") {
		this.target.classList.add('pressed');
		system.change(id);
	}
}





function led(color) {
	return '<object type="image/svg+xml" data="img/led.svg?color='+
		   color+
		   '"></object>';
}


// http://stackoverflow.com/questions/6312993/javascript-seconds-to-time-string-with-format-hhmmss
String.prototype.toHHMMSS = function () {
	var sec_num = parseInt(this, 10); // don't forget the second param
	var hours   = Math.floor(sec_num / 3600);
	var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
	var seconds = sec_num - (hours * 3600) - (minutes * 60);

	if (hours   < 10) {hours   = "0"+hours;}
	if (minutes < 10) {minutes = "0"+minutes;}
	if (seconds < 10) {seconds = "0"+seconds;}
	var time    = hours+':'+minutes+':'+seconds;
	return time;
}
