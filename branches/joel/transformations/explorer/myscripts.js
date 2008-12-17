// Set this to try a callback transformation function
document.xTigerTransformationCallback = function (p, n) { 
	var clstr = n.getAttribute('class');
	var isOption = (-1 != clstr.indexOf('option')) ? true : false;
	var content = n.getElementsByTagName('p')[1]; // 2nd <td>
	if (content && content.innerHTML.match(/^\s*string\s*$/)) { // contains a primitive type only (string)
		var p = n.getElementsByTagName('p')[0]; // 1st <p>
		var label = p.firstChild.data; 
		if (isOption) {
			n.innerHTML = '<p><span class="optionHeader">' + label + '</span>: string</p> ';
		} else {
			n.innerHTML = '<p><span class="useHeader">' + label + '</span>: string</p> ';
		}
	}
}

// Set this to try a callback function called at the end
document.xTigerPostGenerationCallBack = function (parent, doc) {
	var body = document.getElementsByTagName('body')[0];
	var div = document.createElement('div');
	div.setAttribute('id','dialogBox');
	div.innerHTML = '<p>Types</p><p id="msgBox">no selection</p>';
	body.appendChild(div);
}

function handleClick (ev) {
	var parent = ev.target.parentNode;
	var types = parent.getElementsByTagName('p')[0]; // 1st <p>
	var msg = document.getElementById('msgBox');
	msg.firstChild.data = types.firstChild.data;
}
