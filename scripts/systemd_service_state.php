#!/usr/bin/php
<?php

@$service = trim((string) $argv[1]);


if ($service == '') {
	error_log("no service given");
	exit(1);
}


$cmdout  = explode("\n", `/usr/bin/systemctl show $service`);
array_pop($cmdout);
$results = array();

foreach ($cmdout as $c) {
	$kv = explode("=", $c);
	$results[$kv[0]] = $kv[1];
}


if (isset($results["LoadError"])) {
	echo "noservice\n";
} else if (isset($results["ActiveState"])) {
	echo $results["ActiveState"]."\n";
} else {
	echo "nostate\n";
}



?>
