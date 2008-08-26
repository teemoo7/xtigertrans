<?php
/* read the source URL */
$url = $_GET['target'];

/* check if GET or POST request */
if(strtoupper($_SERVER['REQUEST_METHOD']) == 'GET')
{
	echo file_get_contents($url);
}
else
{
	$url = $_POST['target'];	

	$body = file_get_contents('php://input');
	$opts = array('http' =>
	    array(
	        'method'  => 'POST',
	        'header'  => 'Content-type: application/x-www-form-urlencoded',
	        'content' => $body,
	    )
	);
	
	$context  = stream_context_create($opts);
	echo file_get_contents($url, false, $context);
}

?>
