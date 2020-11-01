#!/usr/bin/env php
<?php

//print_r($argv);
//exit();

if (@!$argv[2]) usage();
$filename = sprintf("/tmp/%s.txt", $argv[2]);

switch ($argv[1]) {


case "check":

		$output = array("state" => "off");

		if (file_exists($filename)) {
			$output["state"] = "on";
			if ($argv[2] == "three") $output["text"] = "THREE GOOD";
			if ($argv[2] == "four") {
				$output["extra"] = trim(`shuf -n 1 /usr/share/dict/words`);
				$output["color"] = "orange";
			}

		}

		echo json_encode($output, JSON_PRETTY_PRINT)."\n";


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
