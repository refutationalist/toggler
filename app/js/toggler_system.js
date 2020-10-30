const pexec = require('child_process');
const fs    = require('fs');

function toggler_system() {


	this.MINIMUM_INTERVAL = 500;
	this.FILE_INTERVAL    = 1000;

	this.config_file    = null;
	this.data           = null;
	this.error          = false;
	this.error_string   = null;
	this.title			= false;

	this.check_update   = function(key) {
		console.log(key + " has been updated");
	}

	this.change_update  = function(key) {
		console.log(key + " has finished changing");
	}



}

toggler_system.prototype.load_config = function(config_file, callback) {


	/* did they specify a config file? */
	if (config_file == null ||
		config_file == "") {
		this.error_string = "Please specify a config file.";
		this.error        = true;
	}


	/* do config file */
	fs.readFile(config_file, 'utf8', function(err, data) {

		if (err) {
			console.error(err);
			this.error_string = "Can't open config file: "+err;
			this.error        = true;
		}

		this.data = JSON.parse(data.toString());
		console.log(this.data);
	

		if (typeof(this.data) == "object" &&
			this.data.TOGGLER == true) {
			delete this.data.TOGGLER;

			if (this.data.TITLE != undefined) {
				this.title = this.data.TITLE;
				delete this.data.TITLE;
			}

		} else {
			this.error_string = "Bad config file.";
			this.error        = true;
		}

		setInterval(function() {
			this.check();
		}.bind(this), this.MINIMUM_INTERVAL);

		if (this.data.statefile != undefined) {
			setInterval(function() {
				this.dump_state();
			}.bind(this), this.FILE_INTERVAL);
			this.statefile = this.data.statefile;
			this.writefail = false;
			delete this.data.statefile;
		}



		if (typeof(callback) == "function") callback(this.error,
													 this.error_string);
	
	}.bind(this));
}



toggler_system.prototype.check_single = function(key) {


		pexec.exec(this.data[key].check, function(err, stdout, stderr) {
			var text  = undefined,
				color = undefined,
				state = undefined;

			stdout = stdout.trim();


			try {


				if (err) {
					console.error("Toggler Check Error: "+err);
					this.error        = true;
					this.error_string = err;
					state = "broken";
					color = "black";
					text  = "Exec Error";
		
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

				console.error("Toggler State Error", e.message, this.data[key]);
				text  = "Bad State";
				state = "broken";
				color = "black";

			}


			if (state != undefined &&
				state != this.data[key].state) {
				this.data[key].text  = text;
				this.data[key].state = state;
				this.data[key].color = color;
				console.log(key +" is now in state "+ state);
				if (typeof(this.check_update) == 'function') this.check_update(key);
				
			}



		}.bind(this));

}



toggler_system.prototype.check = function() {

	for (var key in this.data) {

		//console.log("checking", key);


		if (this.data[key].name ||
			this.data[key].check == undefined) continue; // not a stateful button, or no check

	
		if (this.data[key].lastchange == undefined) this.data[key].lastchange = Date.now();


		// FIXME WHY DOES THIS OCCASIONALLY FAIL IT COMPLETELY SHOULDN'T
		try {
			if (this.data[key].delay != undefined) {
				var diff = Date.now() - this.data[key].lastcheck;
				if (  diff < this.data[key].delay ) continue;
				this.data[key].lastcheck = Date.now();
			}
		} catch (e) {
			console.error("delay error WATCH FOR THIS", e.message);
		}


		this.check_single(key);

	}


}


toggler_system.prototype.change = function(key) {

	if (this.data[key] == undefined ||
		this.data[key].active == true) return;


	this.data[key].active = true;


	if (this.data[key].name != undefined) {
		this.change_stateless(key);
	} else if (this.data[key].check != undefined) {
		this.change_stateful(key);
	} else {
		this.error = true;
		this.error_string = "No key '"+key+"' to change!";
		console.error("Toggler Change Error: "+this.error_string);
	}

}



// FIXME: there once was a reason to have stateful and stateless as two separate functions.
//  I'll be damned if I can remember the reason.

toggler_system.prototype.change_stateful = function(key) {

	var state = this.data[key].state;

	if (this.data[key].states[state]     == undefined ||
		this.data[key].states[state].cmd == undefined) {
		this.error        = true;
		this.error_string = "State "+state+" for key "+key+" is not configured properly.";

		this.change_update(key);
		return;

	}

	// FIXME I once had a way to call spawn instead of exec to get around process
	// watching in node.   If something called from toggler forked a process, exec 
	// didn't return.   As it happens, neither does spawn.   So I'm removing the complexity.
	//
	// But the 'bug' is still there.  Since this is mainly going to be used as an interface 
	// for systemd, this isn't huge, but I would like it fixed someday.

	pexec.exec(this.data[key].states[state].cmd, function(err, stdout, stderr) {
		if (stderr) console.error("change_stateful stderr", key, stderr);
		if (err) {
			this.error = true;
			this.error_string = "change_stateful err: "+err;
			console.error(this.error_string);
		}
		this.change_update(key);
		this.data[key].active = false;
		this.data[key].lastchange = Date.now();
	}.bind(this));

	
}


toggler_system.prototype.change_stateless = function(key, callback) {



	if (this.data[key].active == true ||
		this.data[key].cmd    == undefined) {
		this.error        = true;
		this.error_string = "change_stateless: already active or no command";
		if (typeof(callback) == 'function') callback(this.error, this.error_str);

	}


	pexec.exec(this.data[key].do, function(err, stdout, stderr) {
		if (stderr) console.error("change_stateless stderr", key, stderr);

		if (err) {
			this.error = true;
			this.error_string = "change_stateless err: "+err;
			console.error(this.error_string);

		}
		this.data[key].active = false;
		this.change_update(key);
		
	}.bind(this));


}


toggler_system.prototype.dump_state = function() {


	if (this.writefail != true) {


		var floop = JSON.parse(JSON.stringify(this.data));
		for (var key in floop) {
			if (floop[key].states != undefined) {
				delete floop[key].states;
				delete floop[key].check;
			} else {
				delete floop[key];
			}
		}


		fs.writeFile(this.statefile, JSON.stringify(floop), function (err) {
			if (err) {
				console.error(err);
				this.writefail = true;
				this.error = true;
				this.error_string = "Write failed, will not continue writing: "+err;
			}
		}.bind(this));

	}
}

