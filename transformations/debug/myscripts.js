var feedback = [];

function injectFeedback () {
	var div = document.createElement('div');
	for (var i = 0; i < feedback.length; i++) {    
		var p = document.createElement('p');
		var t = document.createTextNode(feedback[i]);
		p.appendChild (t);
		div.appendChild (p);
	}
	var body = document.getElementsByTagName('body')[0];
	body.appendChild (div);
}

// Set this to try a callback transformation function
document.xTigerTransformationCallback = function (p, n) { 
 	var msg = 'Cur path = ' + p.join('/') + ' Node = ' + n.tagName;
	feedback.push(msg);
}

// Set this to try a callback function called at the end
document.xTigerPostGenerationCallBack = function (parent, document) {
	injectFeedback ();
}
