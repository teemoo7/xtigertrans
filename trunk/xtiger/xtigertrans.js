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
	
	It depends on xtigerCore.js

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

xtigerTrans.VERSION = 0.3;
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

/*****************************************************/
/*                                                   */
/*	          Main Class xtigerTrans              	 */
/*                                                   */
/*****************************************************/

function xtigerTrans (transfo, callback) {
	this.transformationSpec = transfo; // memorizes it for forthcoming coupleWithIterator call		
	this.callback = callback;
} 

xtigerTrans.prototype = {
	
	prepareForIteration	: function (iterator) {
			window.console.log('xtigerTrans : prepare transformer for iteration');
			this.context = [];		
	},
	
	initFromURL : function (url) {
		var xhr = xtigerIterator.dom.getXHRObject(); // FIXME : to be put somewhere else 
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
				this.acquireTransformationStruct (container);
			} catch (e){
				alert('Error while reading a template transformation document.' + e);
				return;
			}  		 
	 }
	},            
	
  // To be called if the transformation template is pre-loaded in a window to inherit its scripts and stylesheets
  // doc is the document corresponding to the transformation template
	initFromDocument : function (transfo) {
		var body = transfo.getElementsByTagName('body')[0];		   	
		this.acquireTransformationStruct (body);
	},
		
	/**************************************************/
	/*                                                */
	/*  Templates acquisition methods                 */
	/*                                                */
	/**************************************************/
	
	// Implements the tranformation into the Iterator
	// Basically it must terminates the definition of the types that can be used 
	// in the XTiger template document to transform
	// It does so by defining the "anySimple" and "anyElement" types
	coupleWithIterator : function (iterator) {
		this.iterator = iterator;			
		
		// acquires the transformation structures now that the iterator is known
		// (it needs the iterator to stores some final components in it)
		if (typeof('') == typeof(this.transformationSpec)) { // it's the URL of a transformation definition file
			this.initFromURL (this.transformationSpec);
		} else {  // it's a transformation document DOM
			this.initFromDocument (this.transformationSpec);
		}   		
				
		// defines type anySimple for simple types 
		var anySimple = new Array("string", "number", "boolean");
		iterator.defineUnion("anySimple", anySimple);

		// creates default structures for simple types if they haven't been defined previously
		for(var inc = 0; inc < anySimple.length; inc++) {
			var curType = anySimple[inc];
			if (! iterator.hasType(curType)) {
					var container = document.createElement('span');
					container.setAttribute('class', curType);
					container.textContent = curType + ' ';
					iterator.defineType(curType, new xtigerIterator.Component(xtigerIterator.NATIVE, container));
			}
		}

		// creates a default structure for all target language elements
		for(var inc = 0; inc < this.typesClass.length; inc ++){
			var curType = this.typesClass[inc];
			if (! this.typesStructs[curType]) { // it hasn't been specifically defined (see below)
				var container = document.createElement('div');	//create a container
				container.setAttribute('class', "targetElement");
				container.innerHTML = curType + ' '; //set the type name as text
				iterator.defineType(curType, new xtigerIterator.Component(xtigerIterator.NATIVE, container));
			}
		}

		// registers the specific structured for the target language elements
		for(name in this.typesStructs){	
			window.console.log('Defining native type ' + name + '=' + this.typesStructs[name].innerHTML);			
			iterator.defineType(name, new xtigerIterator.Component(xtigerIterator.NATIVE, this.typesStructs[name]));
		}

		iterator.defineUnion("anyElement", this.typesClass);	
	},	

	// Acquires the templates for a transformation defined in an XHTML file
	// transfoBody is the <body> of that file which must have been previously loaded into memory
	acquireTransformationStruct : function (transfoBody) {
		var transStructs = new Array();
		this.typesClass = new Object();
		this.typesStructs = new Object();
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
								this.iterator.defineType(basicStruct, new xtigerIterator.Component(xtigerIterator.NATIVE, pointer.childNodes[inc]));
							} else if (curType == "xtt:targetElements") {
									this.typesClass = pointer.childNodes[inc].textContent.split(" "); // takes all the types
							} else if (curType == "xtt:targetTemplates") {
									var newPointer = pointer.childNodes[inc];	// changes current pointer
									for(var j = 0; j < newPointer.childNodes.length;j++){
											// for each child of the newPointer
											var name = newPointer.childNodes[j].className;	// checks the class name of the child
											if ( (name !=null) && (name.indexOf("xtt:") == 0) ) { // we have found a special structure, so add it
												this.typesStructs[name.substr(4, name.length - 4)] = newPointer.childNodes[j];
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
	}, 	            
	                         			 	
	/**************************************************/
	/*                                                */
	/*            Utility methods                     */
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
				res = res + ' and ';
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
	
	// Returns the DOM node that need to be managed which is saved in the 'item' element
	// see 'OPAQUE' explanations in saveContext below
	getNodeFromOpaqueContext : function (item) {
			return item[0];		
	},
	
	saveContext : function (data, isOpaque) {
		isOpaque = isOpaque || false;
		var name;
		if (isOpaque) { // treating the expansion of "types" components			
 			// cur[0] is the node to transform
			// cur[1] is the originating (xtigerSrcNode) xt:use or xt:bag
			// cur[2] is the name of the type beeing expanded if it is a type expansion
			name = this.genPathEntryFor(data[1].localName, data[1], data[2]);
	  } else {
			// data is simply the xtigerSrcNode
		  name = this.genPathEntryFor(data.localName, data);
		}
		this.context.push(name);
	},
	
	restoreContext : function (data, isOpaque) {
		this.context.pop();		
	},   
	
	popContext : function () {
		return this.context.pop ();
	},
	
	pushContext : function (cur) {
		this.context.push (cur);
	},
	
	// The xtt_guard is used to avoid calling the callback several times as the tree is beeing built
	callCallback : function (parent) {
		if (! this.callback) { return };
		for (var i = 0; i < parent.childNodes.length; i++) { 			
			var cur = parent.childNodes[i];	 
			var done = false;   			 				
			if (! cur.xtt_guarded) {
				if ((cur.nodeType == Node.ELEMENT_NODE) && cur.hasAttribute('class')) {
					var str = cur.getAttribute('class');
					if (-1 != str.indexOf(xtigerTrans.callbackMarker)) {
						this.callback.call (this, this.context, cur);        
						done= true;						
					}
				}   
				if (! done) {
					// recurse
					this.callCallback (cur);
				}
				cur.xtt_guarded = true; // sets a guard to avoid further recursions
			}
		}
	},
	
	/*********************************************/
	/*                                           */
	/*	xt:component and xt:repeat generation 	 */
	/*                                           */
	/*********************************************/   
	
	// Searches for a Node that contains the string '#content' inside the 'iter' tree
	// Returns the Node pointer
	findContentNode : function (iter) {
		var res = null;
		var strForParent = xtigerIterator.dom.getNodeAsString(iter);
		while (xtigerTrans.isContent.test(strForParent)) { //loop that serves to find the pointer, synchronize the copy and the original	

			if(xtigerTrans.isContentEnd.test(strForParent)) { //if the pointer has only the text #content, it is our point
				res = iter;
				break;
			}

			for(var inc = 0; inc < iter.childNodes.length; inc++) { //loop that serves to find the child that contains the value #content				
				
				var strForChild = xtigerIterator.dom.getNodeAsString(iter.childNodes[inc]);
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
                
	// Expands the tree inside container by replacing its "#content" place holder
	// with the children of the xtigerSrcNode 
	// Accumulates the children of the xtigerSrcNode so that they can further be tranformed
	finishSubstitution : function (xtigerSrcNode, container, accu) {
		var contentNode = this.findContentNode (container);
		if (contentNode) {
			if (contentNode == container) { // container is reduced to a "#content" text child
				xtigerIterator.dom.replaceChildOfByChildOf (container, xtigerSrcNode, accu);
			} else {
				xtigerIterator.dom.replaceNodeByChildOf (contentNode, xtigerSrcNode, accu);
			}
		} else {
			alert('WARNING: transformation of a component or repeat that do not show the content !')
		}
	},	

	genComponentBody : function (componentNode, container) {
		// extracts data from original XTiger node	
		var label = componentNode.getAttribute('name');	
		// subtitutes that data into the template for a xt:component and generates a node
		var stringStruct = this.componentTemplate;
		stringStruct = stringStruct.replace(/#name/g,label);
		container.innerHTML = stringStruct;
	},          
	
	genComponentContent	: function (componentNode, body, accu) {
		this.finishSubstitution (componentNode, body, accu);
	},    
	
	finishComponentGeneration : function (xtigerSrcNode, container) {
	}, 
	
	// Generates the repeat element body inside the container
	genRepeatBody : function (repeatNode, container) {
		// extracts data from original XTiger node	
		var label = repeatNode.getAttribute('label');
		var minOccurs = repeatNode.getAttribute('minOccurs') || 0;
		var maxOccurs	= repeatNode.getAttribute('maxOccurs') || "*"
		// subtitutes that data into the template for xt:repeat
		var stringStruct = this.repeatTemplate;	
		stringStruct = stringStruct.replace(/#label/g,label);
		stringStruct = stringStruct.replace(/#minOccurs/g, minOccurs);
		stringStruct = stringStruct.replace(/#maxOccurs/g, maxOccurs);
		container.innerHTML = stringStruct;
	},   
	
	genRepeatContent	: function (repeatNode, body, accu) {
		this.finishSubstitution (repeatNode, body, accu);
	},  

	finishRepeatGeneration : function (xtigerSrcNode, container) {		
	}, 
	     		
	/*********************************************/
	/*                                           */
	/*	     xt:use and xt:bag generation 	     */
	/*                                           */
	/*********************************************/  
	
	repeatTypes : function (source, dumplings) {
		var res = "";
		for(var j = 0; j < dumplings.length; j++) {
			res += source.replace(/#types/g, dumplings[j]);
		}
		return res;
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
		
	// Finds the node with class name xtt:loop (or xtt:loop_preserve)
	findLoop : function (node, loopNodes) {	 //the root node of the sub-tree we look for loops, and the array to put them
		var listeNode = new Array();															//algorithm that use a stack, this array represents the stack
		listeNode.push(node);																	//at the beginning push the first node
		while(listeNode.length>0){																//while we have a node to test
			var currentNode = listeNode.pop();													//take the node on the stack
			for(var i = 0; i < currentNode.childNodes.length; i++){						//for each child
				if(currentNode.childNodes[i].nodeType ==1){									//verify it is an element
					if(currentNode.childNodes[i].className.indexOf("xtt:loop") > -1){						//if the class attribute of the child is loop
						loopNodes.push(currentNode.childNodes[i]);							//add it to the list of nodes
					}else{
						listeNode.push(currentNode.childNodes[i]);							//add the node to the stack
					}
				}
			}
		}
	},		

	substituteLoopNodes : function (srcXtigerNode, container, types, accu) {
		var loopNodes = new Array();
		var loopNodeHasToBePreserved = this.findLoop(container, loopNodes); // locates xtt:loop in container and returns if the loop node must be preserved or removed
		for(var i = 0; i < loopNodes.length; i++) {

			var pattern = loopNodes[i].innerHTML;			
			if (xtigerTrans.isType.test(pattern)) { // Case #types : simple expansion of type names
				var aStr = this.repeatTypes (pattern, types);
				loopNodes[i].innerHTML = aStr;              
				
			} else if (xtigerTrans.isTypeStruct.test(pattern)) { // Case #typeStrucs :  expansion of types

				var placeholders = new Array ();
				this.duplicateChildren (loopNodes[i], types.length);
				this.findTypeStructNodesIter (loopNodes[i], placeholders);
				var generated;
				var isOpaque = false;
				for (var j = 0; j < types.length; j++) { // loops on types 
					var curComponentForType = this.iterator.getComponentForType(types[j]);
					if (curComponentForType) {
						if (curComponentForType.isNative()) {
							generated = curComponentForType.getClone ();	
							window.console.log("Generating native type for ", srcXtigerNode.getAttribute('label'));
							//this.callCallback (generated);        
							// calls callback because generation of the native component is terminated now
							xtigerIterator.dom.replaceNodeByChildOf (placeholders[j], generated);
						} else {
							generated = curComponentForType.getClone ();
							isOpaque = true;
							accu.push ([generated, srcXtigerNode, types[j]]); 
							placeholders[j].parentNode.replaceChild(generated, placeholders[j]);						
							// the expanded type component will be transformed later by the Iterator
						}   
					} else {
						// FIXME : generer aussi un message dans le document de sortie
						window.console.log('xtigerTrans Type Substitution error, no component defined for ' + types[j]);
					}
				}
				if (isOpaque)	{
					// makes an 'OPAQUE' accu to correctly handle context in forthcoming calls to saveContext 
					accu.splice(0,0,'OPAQUE'); // inserts 'OPAQUE' at the beginning
				}
			}		
		  if (!(loopNodes[i].className.indexOf('xtt:loop_preserve') != -1)) {
			// now replaces 'xtt:loop' loop node with its children
			xtigerIterator.dom.replaceWithChildren (loopNodes[i]);
		  }
		}
	},			   
	
	genBodyFromTemplate : function (node, template) {
		// extracts parameters from xt:use node and injects them into template
		var label = node.getAttribute('label');
		var c = xtigerIterator.dom.extractInner(node, false); // use node content as string
		var res = template.replace(/#label/g, label);
		res = res.replace(/#content/g, c);
		return res;
	},
		
	genIteratedTypeBody : function (kind, xtigerSrcNode, container, types) {   
		var template;
		if ('use' == kind) {
			template = this.useTemplate;
		} else if ('option' == kind) {
			template = this.optionTemplate;			
		} else {
			template = this.bagTemplate;
		}
		container.innerHTML = this.genBodyFromTemplate (xtigerSrcNode, template); 
	},	
	     
	genIteratedTypeContent	: function (kind, xtigerSrcNode, body, accu, types) { 
	  this.substituteLoopNodes (xtigerSrcNode, body, types, accu);
	},
	
	finishIteratedTypeGeneration : function (kind, xtigerSrcNode, container, types) {
		window.console.log("Call callbacks");
		this.callCallback (container);		
	},
	
}	
