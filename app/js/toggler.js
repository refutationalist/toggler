const pexec = require('child_process');
const fs    = require('fs');

function TogglerException(message) {
	this.name = 'TogglerException';
	this.message = message;
}

function Toggler(settings = {}) {

	let defaults = {
		interval_default: 500,
		changed: function(key) {
			console.log(`key ${key} has is changing state`);
		},
		activated: function(key) {
			console.log(`key ${key} has been activated`);
		},
		error: function(txt) {
			console.error(txt);
		},
		log: function(txt) {
			console.log(txt);
		},
		port: null,
		config: null,
		title: null
	};

	this.settings = Object.assign({}, defaults, settings);

	
	this.data         = {};
	this.timers       = {};


	if (this.settings.config == null || this.settings.config == "") {
		throw new TogglerException('invalid config file');
	}

	try {
		this.data = JSON.parse(
			fs.readFileSync(this.settings.config, 'utf8').toString()
		);

		if (typeof(this.data) == "object" &&
			this.data.TOGGLER == true) {
			delete this.data.TOGGLER;

			if (this.data.title != undefined) {
				this.settings.title = this.data.title;
				delete this.data.title;
			}

			if (this.data.port != undefined) {
				this.settings.port = this.data.port;
				delete this.data.port;
			}

		} else {
			throw new TogglerException('uparseable config file');
		}

		for (key in this.data) {


			if (typeof this.data[key].check != 'undefined') { // stateless buttons don't need checks

				let interval = (this.data[key].delay) ? this.data[key].delay : this.settings.interval_default;
				this.settings.log(`setting timer for ${key} at interval ${interval}`);


				this.check(key);
				
				this.timers[key] = setInterval(function(key) {
					this.check(key);
				}.bind(this), interval, key);

			}
		}
		
	} catch (e) {
		throw new TogglerException(`config file parse error: ${e.message}`);
	}


}

Toggler.prototype.check = function(key) {

	
		if (this.data[key].active == true) return; // check is currently underway
		this.data[key].lastcheck = Date.now();
	

		pexec.exec(this.data[key].check, function(err, stdout, stderr) {
			let text  = undefined,
				color = undefined,
				state = undefined;

			stdout = stdout.trim();


			try {


				if (err) {
					this.settings.error(`toggler check error: ${err}`);
					state = "broken";
					color = "black";
					text  = "Check Error";
		
				} else if (stdout != this.data[key].state) {


					if (this.data[key].states[stdout] != undefined) {

						text  = this.data[key].states[stdout].text;
						color = this.data[key].states[stdout].color;
						state = stdout;

					} else {

						text  = 'Unknown State';
						color = 'grey';
						state = 'broken';

					}



				}


			} catch (e) {

				this.settings.error(`toggler check catch error: ${e.message}`);
				console.error(this.data[key]);
				text  = "Bad State";
				state = "broken";
				color = "black";

			}


			if (state != undefined &&
				state != this.data[key].state) {
				this.data[key].text  = text;
				this.data[key].state = state;
				this.data[key].color = color;
				this.settings.log(key +" is now in state "+ state);
				if (typeof(this.settings.changed) == 'function') this.settings.changed(key);
				
			}



		}.bind(this));

}




Toggler.prototype.change = function(key) {

	this.data[key].active = true;


	if (this.data[key].name != undefined) {
		this.stateless(key);
	} else if (this.data[key].check != undefined) {
		this.stateful(key);
	} else {
		this.settings.error(`no change method for ${key}`);
	}

}




Toggler.prototype.stateful = function(key) {

	var state = this.data[key].state;

	if (this.data[key].states[state]     == undefined ||
		this.data[key].states[state].cmd == undefined) {
		this.settings.error(`State ${state} for key ${key} is not configured properly.`);
		this.settings.activated(key);
		this.data[key].active = false;
		return;

	}

	// FIXME I once had a way to call spawn instead of exec to get around process
	// watching in node.   If something called from toggler forked a process, exec 
	// didn't return.   As it happens, neither does spawn.   So I'm removing the complexity.
	//
	// But the 'bug' is still there.  Since this is mainly going to be used as an interface 
	// for systemd, this isn't huge, but I would like it fixed someday.

	pexec.exec(this.data[key].states[state].cmd, function(err, stdout, stderr) {
		if (stderr) this.settings.log(`change stateful stderr [${key}]: ${stderr}`);
		if (err) this.settings.error(`change stateful error: ${err}`);
		this.settings.activated(key);
		this.data[key].active = false;
		this.data[key].lastchange = Date.now();
	}.bind(this));

	
}


Toggler.prototype.stateless = function(key, callback) {


	if (this.data[key].do != undefined) {

		pexec.exec(this.data[key].do, function(err, stdout, stderr) {
			if (stderr) this.settings.log(`change stateless stderr [${key}]: ${stderr}`);
			if (err) this.settings.log(`change stateless error: ${err}`);
			this.data[key].active = false;
			this.settings.activated(key);
			
		}.bind(this));


	} else {
		this.settings.error(`no stateless command for ${key}`);
	}

	

	this.data[key].active = false;

}


