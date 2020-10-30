#!/usr/bin/env php
<?php

//print_r($argv);
//exit();

if (@!$argv[2]) usage();
$filename = sprintf("/tmp/%s.txt", $argv[2]);

switch ($argv[1]) {


	case "check":


		if (file_exists($filename)) {
			echo "the file exists\n";
			exit(0);
		} else {
			echo "file does not exist\n";
			exit(1);
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




function usage() {
	echo "switch.php [check,toggle] [name] [on/off]\n";
	exit(255);
}
