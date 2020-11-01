

const 
	gui = require('nw.gui'),
	win = gui.Window.get(),
	TIMER_INTERVAL = 1000,
	BUTTON_HEIGHT  = 81,
	WINDOW_WIDTH   = 250,
	BOTTOM_MARGIN  = 5;


var system, uitimer;



document.addEventListener("DOMContentLoaded", function() {


	let config = "";


	for (x in gui.App.argv) {
		let str = gui.App.argv[x];
		if (str.match(/^--config=/)) {

			let m   = str.match(/^--config=[\'\"]?(.+?)[\'\"]?$/);
			let env = process.env.PWD;

			log(`config match: ${m[1]}`);

			if (fs.existsSync(m[1])) {
				config = m[1];
			} else if (fs.existsSync(env+'/'+m[1])) {
				config = env+'/'+m[1];
			}
			break;

		}
	}

	if (config == "") {
		log("no config file specified", true);
		gui.App.quit();
	} else {
		log(`config file: ${config}`);
	}


	try {

		system = new Toggler({
			config: config,

			changed: function(key) {

				let elen = document.getElementById(key);
				console.log("element", elen, "text", system.data[key].text);

				if (system.data[key].check == undefined) {
					log(`check for ${key} is undefined`, true);
					return;
				}


				elen.querySelector(`span`).innerHTML = led(system.data[key].color) + system.data[key].text;

				if (system.data[key].state == 'broken') {
					elen.classList.add('broken');
				} else {
					elen.classList.remove('broken');
				}


			}.bind(system),


			activated: function(key) {
				log(key+' has finished changing');
				document.querySelector(`#${key}`).classList.remove('pressed');
			},

			error: function(txt) {
				log(txt, true);
			},

			log: function(txt) {
				log(txt);
			}


		});

	} catch (e) {

		log(`couldn't init Toggler: ${e.message}`);
		process.exit(1);
	}

	uitimer = setInterval(function() {

		for (key in system.data) {

			if (typeof system.data[key].states[ system.data[key].state ].timer != 'undefined') {

				if (typeof system.data[key].lastchange == 'undefined') system.data[key].lastchange = Date.now();

				var diff = (Date.now() - system.data[key].lastchange) / 1000;
				var ts = diff.toString().toHHMMSS();
				document.querySelector(`#${key} .extra`).innerHTML =ts;
			}

		}
	}, 1000);



	if (system.settings.title) document.title = system.settings.title;
	var main = document.querySelector("#main");
	main.innerHTML = "";


	try {

		for (var key in system.data) {
			let text = (system.data[key].name) ? system.data[key].name : key;

			let div = document.createElement("div");
			let span = document.createElement("span");

			main.insertAdjacentHTML(
				'beforeend',
				`<button id="${key}"><span>${text}</span><div class="extra"></div></button>`
			);

			document.querySelector(`#${key}`).addEventListener("click", function(evt) {

				let id = evt.target.id;

				if (system.data[id].state != "broken") {
					evt.target.classList.add('pressed');
					system.change(id);
				}

			});


			let subclick = function(evt) {
				evt.currentTarget.parentNode.click();
			}


			document.querySelector(`#${key} .extra`).addEventListener("click", subclick);
			document.querySelector(`#${key} span`).addEventListener("click", subclick);
			
			
		}

	} catch (e) {
		log(`can't draw buttons: ${e.message}`, true);
		process.exit(1);
	}


	let window_height = (BUTTON_HEIGHT * Object.keys(system.data).length) + BOTTOM_MARGIN;
	win.resizeTo(WINDOW_WIDTH, window_height);
	win.setResizable(false);
	win.show();
	log(`set window height to ${window_height} and showing`);

	

});



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



function log(txt, error = false) {
	let errtxt = (error == true) ? "ERROR" : "INFO";
	let date = Date().toString();
	process.stderr.write(`LOG (${date}) [${errtxt}]: ${txt}\n`);

	if (error) {
		console.error(txt, date);
	} else {
		console.log(txt, date);
	}
}
