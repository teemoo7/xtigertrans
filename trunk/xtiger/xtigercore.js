 /*
	* ***** BEGIN LICENSE BLOCK *****
	* This file is part of "xtigerIterator".
	* Copyright (c) 2007 EPFL and contributors.
	* All rights reserved.
	*
	* "xtigerIterator" is free software; you can redistribute it and/or modify
	* it under the terms of the GNU General Public License version 2 as published by
	* the Free Software Foundation.

	* "xtigerIterator" is distributed in the hope that it will be useful,
	* but WITHOUT ANY WARRANTY; without even the implied warranty of
	* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	* GNU General Public License for more details.
	*
	* You should have received a copy of the GNU General Public License
	* along with "xtigerIterator"; if not, write to the Free Software
	* Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
	*
	* ***** END LICENSE BLOCK *****
	*/  

 /*
	Javascript library to transform XTiger documents according to XHTML template documents
	Initial version for DocReuse project of MEDIA Research Group (GRVA) at EPFL, Switzerland 

	Todo : 
	
	*/

/*********************************************/
/*                                           */
/*	Globals	under the xtigerIterator namespace	 */
/*                                           */
/*********************************************/   

xtigerIterator.VERSION = 0.3;
xtigerIterator.nsXTiger_deprecated = "http://ns.inria.org/xtiger";  // deprecated
xtigerIterator.nsXTiger = "http://wam.inrialpes.fr/xtiger";
xtigerIterator.nsXHTML = "http://www.w3.org/1999/xhtml"
xtigerIterator.isXTiger = /<[^>]*[(component)(use)(repeat)(option)]/;	// detects an XTiger node

/****************************************************************************/
/*                                                                          */
/*   DOM maniplation utility functions under the xtigerIterator.dom namespace	*/
/*                                                                          */
/****************************************************************************/
		
xtigerIterator.dom = {
	
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
		var res = node.getElementsByTagNameNS (xtigerIterator.nsXTiger, name); // gets all the components
		if (0 == res.length ) { // Deprecated
			res = node.getElementsByTagNameNS (xtigerIterator.nsXTiger_deprecated, name);
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
					if (nameSpace == xtigerIterator.nsXHTML) {	// it is a xhtml node
						aStr = xtigerIterator.dom.extractInner(node, false)
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
	// accu is a list of the nodes which have been moved, each node is an array because some transformers
	// may store more information in this kind of accumulator 
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
	
	moveChildOfInto : function (former, newer, accu) {
		var n;
		// inserts the child from newer into former
		while (n = former.firstChild) {
			former.removeChild (n); // FIXME: useless (DOM API removes nodes when moving them)
			newer.appendChild(n);
			if (accu) {
				accu.push (n);
			}
		}		
	},
	
	replaceChildOfByChildOf : function (former, newer, accu) { 
		// removes all children in former 
		var n;
		while (n = former.firstChild) {
			former.removeChild(n);
		}
		// inserts the child from newer into former
		while (n = newer.firstChild) {
			newer.removeChild (n);
			former.appendChild(n);
			if (accu) {
				accu.push (n);
			}
		}
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
/*	Utility Classes under the xtigerIterator namespace	 */
/*                                                   */
/*****************************************************/
		
xtigerIterator.NATIVE = 0;
xtigerIterator.CONSTRUCTED = 1;

// Represents the tree of each component inside the XTiger file to visualize
// NATIVE components correspond to the XTiger builtin types 'string', 'number' and 'boolean'
// or to the target language elements filtered (declared with "xtt:targetElements")
xtigerIterator.Component = function (nature, tree) {
	this.nature = nature;
	this.tree = tree;
	this.str =  null;
}

xtigerIterator.Component.prototype = {
	
	isNative : function () {
		return (xtigerIterator.NATIVE == this.nature);
	},

	hasBeenExpanded : function () {
		return (xtigerIterator.NATIVE == this.nature) || (this.str != null);
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
/*	          Main Class xtigerIterator              */
/*                                                   */
/*****************************************************/   


// Creates an iterator to transform the XTiger template document passed as parameter 
// with the transformer instance
function xtigerIterator (doc, transformer) {	
	this.transformer = transformer;
	this.unionList = new Object(); // type list of the union. any, anyElement, anyComponent, anySimple
	this.componentLib = new Object(); // parsed XTiger components
	this.transformer.coupleWithIterator (this);
	this.acquireComponentStructs (doc); // parses XTiger components
	this.acquireUnion (doc); // resolves the union types
} 

xtigerIterator.prototype = {
		
	/**************************************************/
	/*                                                */
	/*         Components acquisition methods         */
	/*                                                */
	/**************************************************/   
	
	hasType : function (name) {
		return this.componentLib[name] ? true : false;
	},

	defineType : function (name, definition) {
		this.componentLib[name] = definition;
	},
	
	defineUnion : function (name, definition) {
		this.unionList[name] = definition;
	},
	
	getComponentForType : function (name) {
		return this.componentLib[name];
	},

	// Creates a memory structure for each XTiger component defined in its parameter aDocument
	// aDocument must contain an XTiger document tree
	acquireComponentStructs : function (aDocument) {
		var structs = xtigerIterator.dom.getElementsByTagName (aDocument, "component");
		var mapStructs = new Object();
		var mapTypes = new Array();
		for(var inc = 0; inc< structs.length; inc++) {
			var name = structs[inc].getAttributeNode('name').value;
			mapTypes.push(name);
			this.componentLib[name] = new xtigerIterator.Component (xtigerIterator.CONSTRUCTED, structs[inc]);
		}	
		this.unionList['anyComponent'] = mapTypes;
	},

	// Acquires complex types and sets them in the object
	acquireUnion : function (aDocument) {															//aDocument is the XTIGER document from which we take the union and define types
		var unionList = xtigerIterator.dom.getElementsByTagName (aDocument, "union");				//take all union
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
	
	nodeIsAnXTigerSubTree : function (aNode) {
		var res = false;
		if (aNode.nodeType == Node.ELEMENT_NODE) { // checks if there are more XTiger nodes to tranform 
			var ns = aNode.namespaceURI;
			if ((ns == xtigerIterator.nsXTiger) || (ns == xtigerIterator.nsXTiger_deprecated)) { // checks if it's an XTiger node
				res = true;
			} else  { // checks if it contains an XTiger node and if so transforms it
				var aStr = xtigerIterator.dom.getNodeAsString(aNode);
				if (xtigerIterator.isXTiger.test(aStr)) {
					res = true;
				}
			}
		}	
		return res;
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
	transform : function (aNode) {
		this.transformer.prepareForIteration (this);
		this.transformIter (aNode);
	},
		
	transformIter : function (aNode) {
		if (aNode.nodeType == Node.ELEMENT_NODE) { // only operates on element nodes, if not, we don't change it and keep it
			switch (aNode.localName) { 
				case "component":
					this.changeComponent(aNode);
					break;

				case "repeat":
					this.transformer.saveContext (aNode);
					this.changeRepeat(aNode);
					this.transformer.restoreContext (aNode);
					break;

				case "use": 
					this.transformer.saveContext (aNode);
					this.changeUse(aNode); // si pas réel xtt_local_path sur fils 1
					this.transformer.restoreContext (aNode);
					break;

				case "bag":                
					this.transformer.saveContext (aNode);				
					this.changeBag(aNode); 
					this.transformer.restoreContext (aNode);					
					break;

				default: // not a xtiger element, for each child, we will launch the function transform
					this.transformer.saveContext (aNode); // FIXME: aNode.tagName;
					this.continueWithChildOf(aNode);
					this.transformer.restoreContext (aNode);					
			}
		}
	},      
	  
	/*
	Iterates on the children of the node passed as parameter to transform it for presentation:
	- for children sub-trees that contain some Xtiger nodes, continue transformation by calling transform
	- ignores the other children
	Two passes algorithm because calls to transform may change the structure of the tree while iterating
	*/
	continueWithChildOf : function (aNode) {
		var process = new Array();
		for (var i = 0; i < aNode.childNodes.length; i++) { 
			if (this.nodeIsAnXTigerSubTree (aNode.childNodes[i])) {
				  process.push (aNode.childNodes[i]);
			}
		}
		this.transformItems (process);
	},
	
	// The accumulated nodes can be:
	// - either a simple list of nodes (DOM nodes that contain some XTiger at some point) to transform
	// - or a list starting with 'OPAQUE', in that case the following elements represent the current type
	//   which is beeing expanded, each element (cur) is an opaque structure (known only by the transformer) 
	//   and hence each node must be retrieved with getNodeFromOpaqueContext (cur)
	// Note that when iterating on an opaque list of nodes, the top of the context is removed first 
	// and restored at the end. Then, each iteration saves a new element on top of the context, 	
	// setting a true flag on the saveContext / restoreContext calls to indicate this is the result of an 
	// opaque iteration
	transformItems : function (nodes) {
		if (nodes.length == 0)	return; // nothing to transform
		var cur;		
		if (nodes[0] == 'OPAQUE') { // special iteration caused by "types" expansion
			nodes.shift();
			var saved = this.transformer.popContext (); // removes the top context (xt:use or xt:bag)
			while (cur = nodes.shift()) { 
				this.transformer.saveContext (cur, true); // set top context to the current expanded type
				this.transformIter(this.transformer.getNodeFromOpaqueContext(cur));
				this.transformer.restoreContext(cur, true);
			}
			this.transformer.pushContext(saved); // continue as before			
		} else {
			while (cur = nodes.shift()) { 
				this.transformIter(cur);
			}
		}
	},

	// Transformation of a component element
	changeComponent : function (componentNode) {
		var accu = [];
		var container = document.createElement('div');
		this.transformer.genComponentBody (componentNode, container);
		this.transformer.genComponentContent (componentNode, container, accu);
    this.transformItems (accu);
		this.transformer.finishComponentGeneration (componentNode, container);
		xtigerIterator.dom.replaceNodeByChildOf (componentNode, container);
	},

	// Transformation of a repeat element
	changeRepeat : function (repeatNode) {
		var accu = [];
		var container = document.createElement('div');
		this.transformer.genRepeatBody (repeatNode, container, accu);
		this.transformer.genRepeatContent (repeatNode, container, accu);
    this.transformItems (accu);
		this.transformer.finishRepeatGeneration (repeatNode, container);
		xtigerIterator.dom.replaceNodeByChildOf (repeatNode, container);
	},

	// Generation for xt:use and xt:use with option flag
	changeUse : function (xtigerSrcNode) {  
		var accu = [];				
		var container = document.createElement('div');
		var kind = 'use';
		// Attribute option may be null or take the value'set', but not 'option' which is deprecated
		if (xtigerSrcNode.getAttribute('option')) {
			kind = 'option';
		}
		// creates an array that contains all the types of the use element			
		var types = xtigerSrcNode.getAttribute('types').split(" "); 		
		types = this.unionToType(types);		
		this.transformer.genIteratedTypeBody (kind, xtigerSrcNode, container, types);
		this.transformer.genIteratedTypeContent (kind, xtigerSrcNode, container, accu, types);
    this.transformItems (accu);		
		this.transformer.finishIteratedTypeGeneration ('bag', xtigerSrcNode, container, types);
		xtigerIterator.dom.replaceNodeByChildOf (xtigerSrcNode, container);
	},	

	// Transformation of a bag element - same as changeUse except for computation of types
	changeBag : function (bagNode) {
		var accu = [];		
		var container = document.createElement('div');
		// 4. Calculates allowed types and substitute them inside the loops (place holders) of the instantiated visualization template	
		var types = bagNode.getAttribute('types').split(" "); // array that contains all the types of the use element
		types = this.unionToType(types);														// translate list of type into list of types without union
		try{																												//include not mandatory
			var typeIn = bagNode.getAttribute('include').split(" ");				//take the list of types to include
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
			var typeDel = bagNode.getAttribute('exclude').split(" ");				//take the list of types contained in exclude attribute
			typeDel = this.unionToType(typeDel);												//translate union into types
			for(var inc2 = 0; inc2< typeDel.length; inc2++){									//for each type in exclude
				typeString = typeString.replace(new RegExp(" "+typeDel[inc2]+" "), " ");		//delete it if it is present in the list of types
			}
			typeString = typeString.substring(1,typeString.length-1);							//delete the first and last white space
			types = typeString.split(" ");														//put the types in an array
		}catch(err){
		}	
		types = this.unionToType(types);														//translate union into simple types

		this.transformer.genIteratedTypeBody ('bag', bagNode, container, types);
		this.transformer.genIteratedTypeContent ('bag', bagNode, container, accu, types);
    this.transformItems (accu);		
		this.transformer.finishIteratedTypeGeneration ('bag', bagNode, container, types);		
		xtigerIterator.dom.replaceNodeByChildOf (bagNode, container);

	}			
}
