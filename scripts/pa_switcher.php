#!/usr/bin/php
<?php

define('CONNECT',    0);
define('DISCONNECT', 1);

$pa_port = 'Non-Mixer (Ins):PA/out-1';


$stream_ports = array('Non-Mixer (Outs):Master/in-1',
					  'Non-Mixer (Outs):Master/in-2');


switch($argv[1]) {

	case "on":
		do_wiring(CONNECT);
		break;
	case "off":
		do_wiring(DISCONNECT);
		break;
	case "check":
		do_check();
		break;
	default:
		echo "pa_switcher [ on | off | check ]\n";
		break;
}



function do_check() {
	global $pa_port;
	global $stream_ports;

	$ports       = get_ports($pa_port);
	$found_ports = array();

	foreach ($stream_ports as $sp) {
		if (in_array($sp, $ports)) {
			$found_ports[] = $sp;
		}
	}

	if (count($found_ports) == 0) {
		echo "local-only\n";
	} else if (count($found_ports) == count($stream_ports)) {
		echo "to-stream\n";
	} else {
		echo "problem ".count($found_ports)." == ".count($stream_ports)."\n";
	}


}



function do_wiring($state) {
	global $pa_port;
	global $stream_ports;

	$bin = ($state == DISCONNECT) ? '/usr/bin/jack_disconnect' : '/usr/bin/jack_connect';


	foreach ($stream_ports as $s) {
		system("$bin '$pa_port' '$s'");


	}

}


function get_ports($inport) {

	$lines = explode("\n", `/usr/bin/jack_lsp -c '$inport'`);

	// ditch name
	array_shift($lines);
	array_pop($lines);

	// cleanup

	foreach ($lines as &$l) $l = trim($l);
	return $lines;

}

?>
