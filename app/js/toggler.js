const
	pexec = require('child_process'),
	fs    = require('fs'),
	url   = require('url'),
	http  = require('http');

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
		http: null,
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

			if (this.data.http != undefined) {
				this.settings.http = parseInt(this.data.http);
				delete this.data.http;
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


	try {


		if (this.settings.http != null) {
			this.settings.log(`starting http server on localhost:${this.settings.http}`);


			http.createServer(function(req, res) {

				try {
					res.writeHead(200, { 'Content-type': 'application/json' });
					let query = url.parse(req.url, true).query;

					switch (query.cmd) {

						case "status":
							let output = {
								error: 0,
								data: this.data,
								title: this.settings.title
							};
							res.write(JSON.stringify(output, null, 4));
						break;


						case "change":

							if (typeof this.data[query.key] != 'undefined') {
								this.change(query.key);
								res.write(JSON.stringify({ error: 0, text: "done." }, null, 4));
								this.settings.log(`change request for ${query.key} via http`);
							} else {
								res.write(JSON.stringify({ error: 1, text: `key ${query.key} does not exist` }, null, 4));
								console.log(this.data, this.data[query.key]);
								this.settings.error(`requested key ${query.key} via http does not exist`);
							}

						break;

						default:
							res.write(JSON.stringify({ error: 1, text: "Invalid command." }, null, 4));
							this.settings.error(`invalid command ${query.cmd} called via http`);



					}


				} catch (x) {
					res.writeHead(500, { 'Content-Type': 'application/json' }); //, 'Access-Control-Allow-Origin': '*' });
					res.write(JSON.stringify({ error: 1, text: x.message }, null, 4));
					this.settings.error(`http error ${e.message}`);
				}

				res.end();



			}.bind(this)).listen(this.settings.http, '127.0.0.1');
		}







	} catch (e) {
		throw new TogglerException(`could not init webserver: ${e.message}`);

	}


}

Toggler.prototype.check = function(key) {


		if (this.data[key].active == true) return; // check is currently underway
		this.data[key].lastcheck = Date.now();


		pexec.exec(this.data[key].check, function(err, stdout, stderr) {
			let text  = undefined,
				color = undefined,
				state = undefined,
				extra = undefined;




			try {

				let output = JSON.parse(stdout);




				if (err) {
					this.settings.error(`toggler check error: ${err}`);
					state = "broken";
					color = "black";
					text  = "Check Error";
					extra = undefined;

				} else if (output.state != this.data[key].state) {


					if (this.data[key].states[output.state] != undefined) {
						state = output.state;
						text  = (output.text)  ? output.text  : this.data[key].states[state].text;
						color = (output.color) ? output.color : this.data[key].states[state].color;
						if (typeof output.extra != 'undefined') extra = output.extra;

					} else {

						text  = 'Unknown State';
						color = 'grey';
						state = 'broken';
						extra = undefined;

					}



				} else {
					if (output.extra != this.data[key].extra) this.data[key].extra = output.extra;
				}


			} catch (e) {

				this.settings.error(`toggler check catch error: ${e.message}`);
				text  = "Bad State";
				state = "broken";
				color = "black";

			}


			if (state != undefined &&
				state != this.data[key].state) {
				this.data[key].text  = text;
				this.data[key].state = state;
				this.data[key].color = color;
				this.data[key].extra = extra;
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


