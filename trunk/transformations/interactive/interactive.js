function initializeDynamicTreeView (top, doc){
	showTheFirst(doc);
	return false;
}

function showTheFirst(doc){
	var selects = doc.getElementsByTagName("select");
	for(var inc = 0; inc < selects.length; inc++){
		if(selects[inc].className == "loop"){
			var theNode = selects[inc].nextSibling;
			while(theNode.nodeType !=1){
				theNode = theNode.nextSibling;
			}
			theNode = theNode.nextSibling;
			while(theNode.nodeType != 1){
				theNode = theNode.nextSibling;
			}
			theNode = theNode.firstChild;
			while(theNode.nodeType !=1){
				theNode = theNode.nextSibling;
			}
			theNode.setAttribute("style", "display:block");
		}
	}
}

function showOnglet(types, node){
	var selected = false;
	if(node.className=="unSelected"){
		for(var inc = 0; inc < node.parentNode.childNodes.length; inc++){
			if(node.parentNode.childNodes[inc].nodeType==1){
				node.parentNode.childNodes[inc].className="unSelected";
			}
		}
		node.className = "selected";
	}else{
		node.className = "unSelected";
		selected = true;
	}
	var pointer = node.parentNode;
	pointer = pointer.nextSibling;
	while(pointer.nodeType !=1){
		pointer = pointer.nextSibling;
	}
	pointer = pointer.firstChild;
	while(pointer.nodeType!=1){
		pointer = pointer.nextSibling;
	}
	for(var inc = 0; inc < pointer.childNodes.length; inc ++){
		if(pointer.childNodes[inc].nodeType == 1){
			if(pointer.childNodes[inc].className == types){
				if(selected){
					pointer.childNodes[inc].setAttribute("style", "display:none;");
				}else{
					pointer.childNodes[inc].setAttribute("style","");
				}
			}else{
				pointer.childNodes[inc].setAttribute("style", "display:none;");
			}
		}
	}
}

