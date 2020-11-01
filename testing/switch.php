#!/usr/bin/env php
<?php

//print_r($argv);
//exit();

if (@!$argv[2]) usage();
$filename = sprintf("/tmp/%s.txt", $argv[2]);

switch ($argv[1]) {


	case "check":


		if (file_exists($filename)) {
			echo "on\n";
		} else {
			echo "off\n";
		}



		break;


	case "toggle";

		if ($argv[3] == "on") {
			file_put_contents($filename, time());
		} else if ($argv[3] == "off") {
			unlink($filename);
		} else {
			usage();
		}




		break;

	default:
		usage();
}
exit(0);




function usage() {
	echo "switch.php [check,toggle] [name] [on/off]\n";
	exit(1);
}
