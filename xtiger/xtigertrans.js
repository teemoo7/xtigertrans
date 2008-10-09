 /*
	* ***** BEGIN LICENSE BLOCK *****
	* This file is part of "XTigerTrans".
	* Copyright (c) 2007 EPFL and contributors.
	* All rights reserved.
	*
	* "XTigerTrans" is free software; you can redistribute it and/or modify
	* it under the terms of the GNU General Public License version 2 as published by
	* the Free Software Foundation.

	* "XTigerTrans" is distributed in the hope that it will be useful,
	* but WITHOUT ANY WARRANTY; without even the implied warranty of
	* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	* GNU General Public License for more details.
	*
	* You should have received a copy of the GNU General Public License
	* along with "XTigerTrans"; if not, write to the Free Software
	* Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
	*
	* ***** END LICENSE BLOCK *****
	*/  

 /*
	Javascript library to transform XTiger documents according to XHTML template documents
	Initial version for DocReuse project of MEDIA Research Group (GRVA) at EPFL, Switzerland 

	Contributors : Jonathan Wafellman & Stephane Sire 

	Todo : 
	- xtt:loop, xtt:loop-native, xtt:loop-constructed, xtt:use-native  (dans changeUse) 
	- #content and #typeStrucs cannot be mixed with other text in the same PCDATA
	- callback function could be extended to have an extra "component" parameter that could be 
	  a pointer to the XTiger node beeing transformed in the source tree (or in the acquired 
	  component structures), this requires to add it to the path
	- callCallback is called just in changeUse, maybe this is not enough (?)
	- callback function could be extended to be passed user data extracted from the transformation
	  definition file for instance :
	  class="xtt:callback-some-text" would call function (path, cur, "some-text")   
	*/

/*********************************************/
/*                                           */
/*	Globals	under the xtigerTrans namespace	 */
/*                                           */
/*********************************************/   

xtigerTrans.VERSION = 0.1;
xtigerTrans.nsXTiger_deprecated = "http://ns.inria.org/xtiger";  // deprecated
xtigerTrans.nsXTiger = "http://wam.inrialpes.fr/xtiger";
xtigerTrans.nsXHTML = "http://www.w3.org/1999/xhtml"
xtigerTrans.isXTiger = /<[^>]*[(component)(use)(repeat)(option)]/;	// detects an XTiger node
xtigerTrans.isType = /#types/;
xtigerTrans.isTypeStruct = /#typeStruct/;
xtigerTrans.isContent = /#content/;
xtigerTrans.isContentEnd = /^[\s\n\f\r\t\v]*#content[\s\n\f\r\t\v]*$/; // tests if #content is the only word present in a node

xtigerTrans.callbackMarker = "xtt:callback";

xtigerTrans.builtinTypes = {
		"xtt:use"				: "useStruct",
		"xtt:component"	: "componentStruct",
		"xtt:option"		: "optionStruct",
		"xtt:repeat"		: "repeatStruct",
		"xtt:bag"				: "bagStruct"					
	}
	
xtigerTrans.basicTypes = {	// should be aligned with this.unionList["anySimple"] below
		"xtt:string"	: "string",
		"xtt:number"	: "number",
		"xtt:boolean"	: "boolean"				
	}

/****************************************************************************/
/*                                                                          */
/*   DOM maniplation utility functions under the xtigerTrans.dom namespace	*/
/*                                                                          */
/****************************************************************************/
		
xtigerTrans.dom = {
	
	getXHRObject : function () {
		var xhr;
		try { //try-catch that serves to create an ajax request indepedently to the browser used
			xhr = new ActiveXObject('Msxml2.XMLHTTP'); 
			xhr.async =false;
		} catch (e){
			try {   
				xhr = new ActiveXObject('Microsoft.XMLHTTP');  
				xhr.async = false;
			} catch (e2) {
				try {  
					xhr = new XMLHttpRequest();     
				}catch (e3) {  
					xhr = false;   
				}
	  	}
	 	}
		return xhr;
	},
	
	getElementsByTagName : function (node, name) {
		var res = node.getElementsByTagNameNS (xtigerTrans.nsXTiger, name); // gets all the components
		if (0 == res.length ) { // Deprecated
			res = node.getElementsByTagNameNS (xtigerTrans.nsXTiger_deprecated, name);
		}
		return res;
	},		

	// Returns the innerHTML of a XML node
	// set 'keep' to true to include the node itself in the result
	extractInner : function (node, keep) {															
		var tempNode = document.createElement('div'); // temporary container
		tempNode.appendChild(node.cloneNode(true));
		var inner = tempNode.innerHTML;
		if(!keep){																				//if we don't want to keep the node in the inner
			inner = inner.replace(/^<[^>]*>/, "");												//delete the first tag
			inner = inner.replace(/<[^>]*>$/, "");												//and it's ending part
		}
		return inner;																			//return what we wanted
	},

	// Returns a string representing the (DOM) node content
	getNodeAsString : function (node) {
			var aStr;
			switch (node.nodeType) {
				case Node.TEXT_NODE: 
					aStr = node.nodeValue;
					break;

				case Node.ELEMENT_NODE:
					var nameSpace = node.namespaceURI; // checks namespace to know if we can use innerHTML directly or if we have to extract it
					if (nameSpace == xtigerTrans.nsXHTML) {	// it is a xhtml node
						aStr = xtigerTrans.dom.extractInner(node, false)
					} else {
						aStr = node.innerHTML;
					}
					break;

				default: aStr = '';
			}
			return aStr;
	},

	// Replaces the node "former" by all the children of the node "newer"
	// The "former" node must have a parent node, it must not be a dangling node
	// At the end, "newer" is an empty node
	replaceNodeByChildOf : function (former, newer, accu) {
		var n;
		while (n = newer.firstChild) {
			newer.removeChild (n);
			former.parentNode.insertBefore(n, former);
			if (accu) {
				accu.push (n);
			}
		}
		former.parentNode.removeChild(former);	
	},

	// Replaces a node by a new one
	replaceNodeBy : function (former, newer) {
		former.parentNode.insertBefore(newer, former);
		newer.parentNode.removeChild(former);	
		return newer;
	}, 

	// Replaces a node by all its children
	replaceWithChildren : function (node) {
		var n;
		while(n = node.firstChild){
			node.removeChild(n);
			node.parentNode.insertBefore(n, node);
		}
		node.parentNode.removeChild(node);
	}
}	
			
/*****************************************************/
/*                                                   */
/*	Utility Classes under the xtigerTrans namespace	 */
/*                                                   */
/*****************************************************/
		
xtigerTrans.NATIVE = 0;
xtigerTrans.CONSTRUCTED = 1;

// Represents the tree of each component inside the XTiger file to visualize
// NATIVE components correspond to the XTiger builtin types 'string', 'number' and 'boolean'
// or to the target language elements filtered (declared with "xtt:targetElements")
xtigerTrans.Component = function (nature, tree) {
	this.nature = nature;
	this.tree = tree;
	this.str =  null;
}

xtigerTrans.Component.prototype = {
	
	isNative : function () {
		return (xtigerTrans.NATIVE == this.nature);
	},

	hasBeenExpanded : function () {
		return (xtigerTrans.NATIVE == this.nature) || (this.str != null);
	},
	
	getSource : function () {
		if (! this.str) {
			this.str = this.tree.innerHTML;
		}
		return this.str;
	},
	
	getTree : function () {
		return this.tree;
	},
	
	getClone : function () {
		var res = this.tree.cloneNode(true);
		return res;
	},
		
	// unused : was used for the cache system with innerHTML
	setSource : function (val) {
		this.str = val;
	},

	// unused : was used for the cache system with node cloning
	setTree : function (root) {
		this.tree = root;
	}
	
}

/*****************************************************/
/*                                                   */
/*	          Main Class xtigerTrans              	 */
/*                                                   */
/*****************************************************/

// Object that serve to manipulate the xtiger document, assign methods and structures
// doc is the XTiger document we work on, it serves to acquire all the structures of the document (ie : component)
function xtigerTrans() {	
	this.unionList = new Object(); // type list of the union. any, anyElement, anyComponent, anySimple has been set in too
	this.componentLib = new Object(); // component structures. It serves to insert them where it is ask to	
} 

xtigerTrans.prototype = {
	
	initTransformerFromURL : function (doc, url) {
		var xhr = xtigerTrans.dom.getXHRObject();
		xhr.open( "GET", url,  false);	// false for synchronous mode
		xhr.send(null);	
    if((xhr.status  == 200) || (xhr.status  == 0)) { // (xhr.status  == 0) added for local exec directly from file (no web server)
			try {
				var documentString = xhr.responseText;        
				// creates a div element that will receive the content of the body of the transformation
				var container = document.createElement('div');
				documentString = documentString.replace(/^[^]*<body[^>]*>\s*/,"");
				documentString = documentString.replace(/\s*<\/body>[^]*$/, "");
				container.innerHTML = documentString;
				// acquires the different structures
				this.acquireTransformationStruct (container);
				this.acquireComponentStructs (doc); // components of the specified document
				this.acquireUnion (doc); // acquisition of its unions				
			} catch (e){
				alert('Error while reading template document.' + e);
				return;
			}  		 
	 }
	},            
	
  // To be called if the transformation template is pre-loaded in a window to inherit its scripts and stylesheets
  // doc is the document corresponding to the transformation template
	initTransformerFromDocument : function (doc, transfoDoc) {
		var body = transfoDoc.getElementsByTagName('body')[0];		   	
		this.acquireTransformationStruct (body);
		this.acquireComponentStructs (doc); // aquisition of the components of the specified document
		this.acquireUnion (doc); // acquisition of its unions
	},
		
	/**************************************************/
	/*                                                */
	/*  Templates and components acquisition methods  */
	/*                                                */
	/**************************************************/

	// Creates a memory structure for each XTiger component defined in its parameter aDocument
	// aDocument must contain an XTiger document tree
	acquireComponentStructs : function (aDocument) {
		var structs = xtigerTrans.dom.getElementsByTagName (aDocument, "component"); // gets all the components
		var mapStructs = new Object();
		var mapTypes = new Array();
		for(var inc = 0; inc< structs.length; inc++) {						// iterates over all the components
			var name = structs[inc].getAttributeNode('name').value;
			mapTypes.push(name);
			this.componentLib[name] = new xtigerTrans.Component (xtigerTrans.CONSTRUCTED, structs[inc]);
		}	
		this.unionList['anyComponent'] = mapTypes;								// adds the type anyComponent in the list of possible types
	},

	// Acquires complex types and sets them in the object
	acquireUnion : function (aDocument) {															//aDocument is the XTIGER document from which we take the union and define types
		var unionList = xtigerTrans.dom.getElementsByTagName (aDocument, "union");				//take all union
		var mapUnion = new Object();															//create the object that will contain all the types of each union element
		for(var inc = 0; inc<unionList.length; inc++){											//for each union

			var typeIn = unionList[inc].getAttributeNode('include').value.split(" ");			//we put the list of types to include
			this.unionToType(typeIn);															//to be sure that the union contains only simple types and no other unions
			var typeString = " " + typeIn.join(" ") + " ";										//prepair to remove the types to exclude, because we use a regular expression

			try{																				//attribute exclude not mandatory
				var typeDel = unionList[inc].getAttributeNode('exclude').value.split(" ");		//put in the array all the types to exclude
				this.unionToType(typeDel);														//to be sure we have only simple types and no union
				for(var inc2 = 0; inc2< typeDel.length; inc2++){								//for all types to exclude
					typeString = typeString.replace(new RegExp(" "+typeDel[inc2]+" "), " ");	//replace the ith type by " "	
				}

			}catch(err){							
			}

			typeString = typeString.substring(1,typeString.length-1);							//remove the first and the last space of the string that represent the list of type
			this.unionList[unionList[inc].getAttributeNode('name').value] = typeString.split(" ");
																								//we can assign the list of the nodes
		}

		this.unionList["any"] = this.unionList["anySimple"].concat(this.unionList["anyElement"], this.unionList["anyComponent"]);
																								//define and assign the type any
	},

	// Acquires the structure of the transformation defined by the developper
	// url is the URL of the document where are the defined 	
	acquireTransformationStruct : function (transfoBody) {
		var transStructs = new Array();		// object that will temporary contain the structures for the transformation
		var typesClass = new Object();		// object that will contain the type of the target language
		var typesStructs = new Object();	// object that will contain the special structure 

		try {
				var pointer = transfoBody; // tree node iterator				
				for(var inc = 0; inc < pointer.childNodes.length; inc++){	// iterates on all children of the body

					if(pointer.childNodes[inc].nodeType == 1){	// checks if it's an element node

						var curType = pointer.childNodes[inc].className;						
						var curStruct = xtigerTrans.builtinTypes[curType];

						if (curStruct) { 
							// stores tree for each template that represents builtin XTiger types
							transStructs[curStruct] = pointer.childNodes[inc]; 
						} else {
							var basicStruct = xtigerTrans.basicTypes[curType];
							if (basicStruct) {
								// extracts structure (as DOM tree) for basic XTiger types
								this.componentLib[basicStruct] = new xtigerTrans.Component(xtigerTrans.NATIVE, pointer.childNodes[inc]);
							} else if (curType == "xtt:targetElements") {
									typesClass = pointer.childNodes[inc].textContent.split(" "); // takes all the types
							} else if (curType == "xtt:targetTemplates") {
									var newPointer = pointer.childNodes[inc];	// changes current pointer
									for(var inc2 = 0; inc2 < newPointer.childNodes.length;inc2++){
											// for each child of the newPointer
											var name = newPointer.childNodes[inc2].className;	// checks the class name of the child
											if ( (name !=null) && (name.indexOf("xtt:") == 0) ) { // we have found a special structure, so add it
												typesStructs[name.substr(4, name.length - 4)] = newPointer.childNodes[inc2];
											}
									}
							}
						}
					}
				} // of for
		}	catch (e) {
			alert("Impossible to read transformation because " + e);		
		}

		// stores the templates associated with the selected transformation of XTiger documents
		// they are stored as a innerHTML string for convenience (hence they can contain a forest)
		this.useTemplate = transStructs["useStruct"].innerHTML;
		this.componentTemplate = transStructs["componentStruct"].innerHTML;
		this.optionTemplate = transStructs["optionStruct"].innerHTML;
		this.repeatTemplate = transStructs["repeatStruct"].innerHTML;
		this.bagTemplate = transStructs["bagStruct"].innerHTML;

		// defines type anySimple for simple types 
		this.unionList["anySimple"] = new Array("string", "number", "boolean");

		// creates default structures for simple types if they haven't been defined previously
		for(var inc = 0; inc < this.unionList["anySimple"].length; inc++) {
			var curType = this.unionList["anySimple"][inc];
			if (! this.componentLib[curType]) { // curType simple type was not defined, defines it !
					var container = document.createElement('span');
					container.setAttribute('class', curType);
					container.textContent = curType + ' ';
					this.componentLib[curType] = new xtigerTrans.Component(xtigerTrans.NATIVE, container);
			}
		}

		// creates a default structure for all target language elements
		for(var inc = 0; inc < typesClass.length; inc ++){
			var curType = typesClass[inc];
			if (! typesStructs[curType]) { // it hasn't been specifically defined (see below)
				var container = document.createElement('span');	//create a container
				container.setAttribute('class', "targetElement");
				container.innerHTML = curType + ' '; //set the type name as text
				this.componentLib[curType] = new xtigerTrans.Component(xtigerTrans.NATIVE, container);
			}
		}

		// registers the specific structured for the target language elements
		for(typeName in typesStructs){	
			this.componentLib[typeName] = new xtigerTrans.Component(xtigerTrans.NATIVE, typesStructs[typeName]);
		}

		this.unionList["anyElement"] = typesClass;	//and assign types to the lis of types   
	}, 
	
	// Extracts union names from a list of types and translate them into list of simple types
	unionToType : function (types){																//list of type to verify and transform if needed													
		if(types.length==1){																	//because javascript is not typed and i don't want to have a string
			if(this.unionList[types] != null){													//test the type
				types = this.unionList[types];													//if needed replace by 
			}
		}else{																					//we have more thant one type
			var initialLength = types.length;													//we take the number of type to verify, because we will concatanate arrays and we are sure that no union contains others union
			for(var inc = 0; inc < initialLength; inc ++){										//for each type
				if(this.unionList[types[inc]] != null){ 										//is it an union?
					var thisUnion = this.unionList[types[inc]];									//take the corresponding types
					types.splice(inc,1);														//delete the union from the list of types
					inc	 -= 1;																	//an  element has been deleted, decrease the increment
					types = types.concat(thisUnion);											//put the elements of the union
				}
			}
		}
		return types;																			//return the values
	},	
	
	/**************************************************/
	/*                                                */
	/*       XHTML generation utility methods         */
	/*                                                */
	/**************************************************/	
	
	genPathEntryFor : function (xtigerTag, node, extraType) {
		var l = node.getAttribute('label');
		var res = xtigerTag;
		if (l || extraType) {
			res = res + "[";
		}
		if (l) {
			res = res + '@label="' + l + '"'; 			
			if (extraType) {
				res = res + ',';
			}
		} 
		if (extraType) {
			res = res + '@currentType="' + extraType + '"';
		}
		if (l || extraType) {
			res = res + "]";
		}
		return res;
	},
	
	repeatTypes : function (source, dumplings) {
		var res = "";
		for(var inc2 = 0; inc2 < dumplings.length; inc2++) {
			res += source.replace(/#types/g, dumplings[inc2]);
		}
		return res;
	},

	// deprecated : was used in first version to generate components for types
	repeatTypeStructs : function (source, dumplings) {
		var res = "";
		for(var inc2 = 0; inc2 < dumplings.length; inc2++){

			res += source.replace(/#typeStruct/g, dumplings[inc2].getSource()); 
		}
		return res;
	},
			
	nodeIsAnXTigerSubTree : function (aNode) {
		var res = false;
		if (aNode.nodeType == Node.ELEMENT_NODE) { // checks if there are more XTiger nodes to tranform 
			var ns = aNode.namespaceURI;
			if ((ns == xtigerTrans.nsXTiger) || (ns == xtigerTrans.nsXTiger_deprecated)) { // this is an XTiger node, transforms it
				res = true;
			} else  { // checks if it contains an XTiger node and if so transforms it
				var aStr = xtigerTrans.dom.getNodeAsString(aNode);
				if (xtigerTrans.isXTiger.test(aStr)) {
					res = true;
				}
			}
		}	
		return res;
	},
	
	// Searches for a Node that contains the string '#content' inside the 'iter' tree
	// Returns the Node pointer
	findContentNode : function (iter) {
		var res = null;
		var strForParent = xtigerTrans.dom.getNodeAsString(iter);
		while (xtigerTrans.isContent.test(strForParent)) { //loop that serves to find the pointer, synchronize the copy and the original	

			if(xtigerTrans.isContentEnd.test(strForParent)) { //if the pointer has only the text #content, it is our point
				res = iter;
				break;
			}

			for(var inc = 0; inc < iter.childNodes.length; inc++) { //loop that serves to find the child that contains the value #content				
				
				var strForChild = xtigerTrans.dom.getNodeAsString(iter.childNodes[inc]);
				if(xtigerTrans.isContent.test(strForChild)) {			//we have found the good child
					iter = iter.childNodes[inc];										//set the value of the child to the pointer
					strForParent = strForChild;
					break;
					// inc = iter.childNodes.length;										//stop the loop for
				}				
			}
		}		
		return res;
	},

	finishSubstitution : function (aNode, templateNode, curPath) {
		var contentNode = this.findContentNode (templateNode);	// FIXME: it may be possible to use a cached templateNode object ?
		if (contentNode) {
			var followup = new Array ();
			if (contentNode == templateNode) { // the substitution template is reduced to a #content directive
				xtigerTrans.dom.replaceNodeByChildOf (aNode, aNode, followup);
			} else {
				xtigerTrans.dom.replaceNodeByChildOf (contentNode, aNode, followup);
				xtigerTrans.dom.replaceNodeByChildOf (aNode, templateNode);				
			}
			var cur;
			while (cur = followup.shift()) {
				if (this.nodeIsAnXTigerSubTree (cur)) {
					this.xtigerToHTMLiter (cur, curPath);
				}
			}
		} else {
			alert('WARNING: transformation of a component that do not show the content !')
			// Substitutes the xt:component in the copy with the new template	
			xtigerTrans.dom.replaceNodeBy (aNode, templateNode); // at that stage targetNode children have been copie into contentNode
			xtigerTrans.dom.replaceWithChildren (templateNode); // templateNode root is substituted by its children
		}
	},
	
	// Finds the node with the className loop
	findLoop : function (node, loopNodes) {	 //the root node of the sub-tree we look for loops, and the array to put them
		var listeNode = new Array();															//algorithm that use a stack, this array represents the stack
		listeNode.push(node);																	//at the beginning push the first node
		while(listeNode.length>0){																//while we have a node to test
			var currentNode = listeNode.pop();													//take the node on the stack
			for(var inc = 0; inc < currentNode.childNodes.length; inc++){						//for each child
				if(currentNode.childNodes[inc].nodeType ==1){									//verify it is an element
					if(currentNode.childNodes[inc].className == "xtt:loop"){						//if the class attribute of the child is loop
						loopNodes.push(currentNode.childNodes[inc]);							//add it to the list of nodes
					}else{
						listeNode.push(currentNode.childNodes[inc]);							//add the node to the stack
					}
				}
			}
		}
	},
	
	// Copy n - 1 times the children of tree into itself
	duplicateChildren : function (tree, n) {
		var count = tree.childNodes.length;
		for (var i = 0; i < (n - 1); i++) {
			for (var j = 0; j < count; j++) {
				tree.appendChild (tree.childNodes[j].cloneNode(true));
			}
		}
	},
	
	findTypeStructNodesIter : function (top, accu) {
		for (var i = 0; i < top.childNodes.length; i++) {
			var cur = top.childNodes[i];						
			if ((Node.TEXT_NODE == cur.nodeType) && xtigerTrans.isTypeStruct.test(cur.nodeValue)) {
				accu.push (cur);
			} else if (Node.ELEMENT_NODE == cur.nodeType) {
				this.findTypeStructNodesIter (cur, accu);
			}		
		}
	},
	
	// Iterates on root and each time it finds a TEXT_NODE with value #typeStructs 
	// injects a current tree from the trees in structs in place of it
	replaceTypeStructWithSubTrees : function (root, structs) {
		var pointers = new Array ();
		this.findTypeStructNodesIter (root, pointers);
		if (pointers.length != structs.length) {
			alert ('DEBUG: not enough structures to fill #typeStructs !');
		}
		for (var i = 0; i < pointers.length; i++ ) {
			xtigerTrans.dom.replaceNodeByChildOf (pointers[i], structs[i]);
		}
	},	
		
	substituteLoopNodes : function (srcXtigerNode, root, types, curPath) {
		var loopNodes = new Array();
		this.findLoop(root, loopNodes);			// find the nodes where we loop and stocks it in an array

		for(var inc = 0; inc < loopNodes.length; inc++) {

			var pattern = loopNodes[inc].innerHTML; // serializes
			if (xtigerTrans.isType.test(pattern)) {
				
				var aStr = this.repeatTypes (pattern, types); // duplicates with type names
				loopNodes[inc].innerHTML = aStr; // converts it back to a tree
			} else if (xtigerTrans.isTypeStruct.test(pattern)) {

				// prepares an array of tansformed type structures to inject them in #typeStrucs
				var structs = new Array ();
				var pivot;
				var parent;
				for (var inc2 = 0; inc2 < types.length; inc2++) { // loops on allowed types 
					// saves current path on stack
					var saved = curPath.pop ();
					var name = this.genPathEntryFor('use', srcXtigerNode, types[inc2]);
					curPath.push(name);
					// treats current component type
					var curComponentForType = this.componentLib[types[inc2]];
					if (curComponentForType.isNative()) {						
						parent = curComponentForType.getClone ();
						// maybe we should use a temporary container to store the parent
						this.callCallback (parent, curPath);
						structs.push (parent);												
					} else {
						pivot = document.createElement('div'); // simulate a "body" container
						parent = curComponentForType.getClone ();
						pivot.appendChild (parent);
						this.xtigerToHTMLiter (parent, curPath, true);
						structs.push (pivot); 
							// memorizes pivot because component generation has moved up the tree
							// (ie the component in parent has been replaced by its children)					
					} 
					// restores current path on the stack
					curPath.pop();
					curPath.push (saved);						
				}	
				this.duplicateChildren (loopNodes[inc], structs.length)
				this.replaceTypeStructWithSubTrees (loopNodes[inc], structs);
			}		
		  // 3. replacement of "#typeStruct" is okay, now replaces the 'loop' node with its children
		  xtigerTrans.dom.replaceWithChildren (loopNodes[inc]);
		}
	},		
	
	// The xtt_guard is used to avoid calling the callback several times as the tree is beeing built
	callCallback : function (parent, curPath) {
		if (! this.callback) { return };
		for (var i = 0; i < parent.childNodes.length; i++) { 			
			var cur = parent.childNodes[i];	 
			var done = false;   			 				
			if (! cur.xtt_guarded) {
				if ((cur.nodeType == Node.ELEMENT_NODE) && cur.hasAttribute('class')) {
					var str = cur.getAttribute('class');
					if (-1 != str.indexOf(xtigerTrans.callbackMarker)) {
						this.callback.call (this, curPath, cur);        
						done= true;						
					}
				}   
				if (! done) {
					// recurse
					cur.xtt_guarded = true; // sets a guard to avoid further recursions
					this.callCallback (cur, curPath);
				}
			}
		}
	},
		
	/***********************************************************/
	/*                                                         */
	/*  XTiger template tree transformation to XHTML methods   */
	/*                                                         */
	/***********************************************************/

	/* 
	Calls the transformation when it is needed
	currentNode is the node in the orginal xtiger document, that won't change
	newNode is the node of the new tree we will display
	*/
	xtigerToHTML : function (aNode, callback) {
		this.callback = callback;
		this.xtigerToHTMLiter (aNode, [], true);
	},
		
	xtigerToHTMLiter : function (aNode, curPath) {
		if (aNode.nodeType == Node.ELEMENT_NODE) { // only operates on element nodes, if not, we don't change it and keep it	
			switch (aNode.localName) { 
			// looks for the element tagName, if it is a xtiger node, we launch the modification, if not, continue recursively		
				// case "option":
				// 	this.changeOption(currentNode,newNode);
				// 	break;			
				case "component":
					this.changeComponent(aNode, curPath);
					break;

				case "repeat":
				  var name = this.genPathEntryFor('repeat', aNode);
					curPath.push(name);				
					this.changeRepeat(aNode, curPath);
					curPath.pop();					
					break;

				case "use": 
			  	var name = this.genPathEntryFor('use', aNode);
					curPath.push(name);				
					this.changeUse(aNode, curPath); // si pas réel xtt_local_path sur fils 1
					curPath.pop();
					break;

				case "bag":
			  	var name = this.genPathEntryFor('bag', aNode);
					curPath.push(name);								
					this.changeBag(aNode, curPath);
					curPath.push(name);													
					break;

				default: // not a xtiger element, for each child, we will launch the function xtigerToHTML
		  		var name = aNode.tagName;
					curPath.push(name);
					this.continueWithChildOf(aNode, curPath); // continue the recursion on the children
					curPath.pop();					
			}
		}
	},

	/*
	Iterates on the children of the node passed as parameter to transform it for presentation:
	- for children sub-trees that contain some Xtiger nodes, continue transformation by calling xtigerToHTML
	- ignores the other children
	Two passes algorithm because calls to xtigerToHTML may change the structure of the tree while iterating
	*/
	continueWithChildOf : function (aNode, curPath) {
		var process = new Array();
		for (var i = 0; i < aNode.childNodes.length; i++) { 
			if (this.nodeIsAnXTigerSubTree (aNode.childNodes[i])) {
				  process.push (aNode.childNodes[i]);
			}
		}
		var cur;		
		while (cur = process.shift()) {
			this.xtigerToHTMLiter(cur, curPath);
		}
	},

	// Transformation of a component element
	// Works in parallel on the XTiger document and the HTML representation
	changeComponent : function (componentNode, curPath) {

		// 1. Extracts data from original XTiger node	
		var label = componentNode.getAttributeNode('name').value;	

		// 2. Subtitutes that data into the template for a xt:component and generates a node
		var stringStruct = this.componentTemplate;
		stringStruct = stringStruct.replace(/#name/g,label);
		var template = document.createElement('span');
		template.innerHTML = stringStruct;

		// 3. Completes the template and replaces the xt:component with it
		this.finishSubstitution (componentNode, template, curPath);
	},

	// Transformation of a repeat element
	changeRepeat : function (repeatNode, curPath) {

		// 1. Extracts data from original XTiger node	
		var label = repeatNode.getAttributeNode('label').value;
		var minOccurs;
		var maxOccurs;	
		try{
			minOccurs = repeatNode.getAttributeNode('minOccurs').value;
		} catch (e) {
			minOccurs = 0; // default
		}
		try {
			maxOccurs = repeatNode.getAttributeNode('maxOccurs').value;
		} catch (e){
			maxOccurs = "*";  // default
		}

		// 2. Subtitutes that data into the template for xt:components and generate a node
		var stringStruct = this.repeatTemplate;	
		stringStruct = stringStruct.replace(/#label/g,label);
		stringStruct = stringStruct.replace(/#minOccurs/g, minOccurs);
		stringStruct = stringStruct.replace(/#maxOccurs/g, maxOccurs);
		var template = document.createElement('span');
		template.innerHTML = stringStruct;

		// 3. Completes the template and replaces the xt:repeat with it
		this.finishSubstitution (repeatNode, template, curPath);
	},

	// Transformation of a use element
	// FIXME : handle 'option' attribute => utiliser un template "externe" pour intégrer le résultat de la transformation du xt:use 
	changeUse : function (useNode, curPath) {
		// 1. Selects target visualization template
		var optional = useNode.getAttributeNode('option');
		var stringStruct = optional ? this.optionTemplate : this.useTemplate;

		// 2. Extracts parameters from xt:use node and injects them into template
		var label = useNode.getAttributeNode('label').value;
		stringStruct = stringStruct.replace(/#label/g, label);
		stringStruct = stringStruct.replace(/#content/g, xtigerTrans.dom.extractInner(useNode, false)); 
			// injects former content (iterations will continue on it)

		// 3. Creates a fake container and instantiates visualization template within it
		var container = document.createElement('div');
		container.innerHTML = stringStruct;  		   
		
		// 4. Calculates allowed types and substitute them inside the loops (place holders) of the instantiated visualization template	
		var types = useNode.getAttributeNode('types').value.split(" "); // creates an array that contains all the types of the use element	
		types = this.unionToType(types);	                            
	  this.substituteLoopNodes (useNode, container, types, curPath);
		this.callCallback (container, curPath);

		// 5. Replaces original xt:use node with the content of the fake template
		xtigerTrans.dom.replaceNodeByChildOf (useNode, container);
	},

	// Transformation of a bag element - same as changeUse except for computation of types
	// FIXME: rewrite computation of types
	// FIXME: factorize code with changeUse
	changeBag : function (bagNode, curPath) {
		// 1. Selects target visualization template	
		var stringStruct = this.bagTemplate;

		// 2. Extracts parameters from xt:use node and injects them into template	
		var label = bagNode.getAttributeNode('label').value;
		stringStruct = stringStruct.replace(/#label/g, label);
		stringStruct = stringStruct.replace(/#content/g, xtigerTrans.dom.extractInner(bagNode, false)); 
			// injects former content (iterations will continue on it)	

		// 3. Creates a fake container and instantiates visualization template within it
		var container = document.createElement('div');
		container.innerHTML = stringStruct;

		// 4. Calculates allowed types and substitute them inside the loops (place holders) of the instantiated visualization template	
		var types = bagNode.getAttributeNode('types').value.split(" "); // array that contains all the types of the use element
		types = this.unionToType(types);														// translate list of type into list of types without union
		try{																												//include not mandatory
			var typeIn = bagNode.getAttributeNode('include').value.split(" ");				//take the list of types to include
			typeIn = this.unionToType(typeIn);													//translate union into types
			var typeString = " " + typeIn.join(" ") + " ";										//create a string containing the types to include separated by " "
			for(var inc = 0; inc < types.length;inc ++){										//for each type
				typeString = typeString.replace(new RegExp(" "+types[inc] + " "), " ");			//delete the type from the string if they are in the attribute types and include
			}
			typeString = typeString.substring(1, typeString.length-1);							//delete the first and the last white space
			typeIn = typeString.split(" ");														//make an array from the string containing the types
			types = types.concat(typeIn);														//Concatenate the types and include
		} catch(err) {
		}
		try{																					//exclude not mandatory
			var typeString = " " + types.join(" ") + " ";										//put the value of types in a string with withe space at the beginning and at the end for the following regular expression
			var typeDel = bagNode.getAttributeNode('exclude').value.split(" ");				//take the list of types contained in exclude attribute
			typeDel = this.unionToType(typeDel);												//translate union into types
			for(var inc2 = 0; inc2< typeDel.length; inc2++){									//for each type in exclude
				typeString = typeString.replace(new RegExp(" "+typeDel[inc2]+" "), " ");		//delete it if it is present in the list of types
			}
			typeString = typeString.substring(1,typeString.length-1);							//delete the first and last white space
			types = typeString.split(" ");														//put the types in an array
		}catch(err){
		}	
		types = this.unionToType(types);														//translate union into simple types
	  this.substituteLoopNodes (bagNode, container, types, curPath);

		// 5. Replaces original xt:use node with the content of the fake template
		xtigerTrans.dom.replaceNodeByChildOf (bagNode, container);
	}			
}
