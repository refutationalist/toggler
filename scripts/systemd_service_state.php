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


$status = "nostate";
if (isset($results["LoadError"])) {
	$status =  "noservice";
} else if (isset($results["ActiveState"])) {
	$status = $results["ActiveState"];
}

echo json_encode(array("state" => $status),  JSON_PRETTY_PRINT) . "\n";





?>
