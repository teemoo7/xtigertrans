//
//Javascript library developped to transform XTiger documents
//
//Developped for DocReuse project in the global computing laboratory from the EPFL, Switzerland by Jonathan Wafellman
//
//

/***********************************************************************************************************
*																				*
*							Object definition											*
*																				*
/***********************************************************************************************************/


//Object that serve to manipulate the xtiger document, assign methods and structures//
function xtigerTrans(doc, url){																//doc represent the xtiger document we work on, it serves to acquire all the structures of the document (ie : component)
	
	this.unionList = new Object();															//Value that contains the type list of the union. any, anyElement, anyComponent, anySimple has been set in too
	this.componentStructs = new Object();													//Value taht contains all the component structure. It serves to insert them where it is ask to .
		
	this.xtigerToHTML = xtigerToHTML;														//Assign the method that we will use to transform the document
	this.continueRecursion = continueRecursion;												//function that continue the recursion with children of a node
	
	this.changeUse = changeUse;																//Assign the method that will transform the use elements
	this.changeOption = changeOption;														//Assign the method that will transform the option elements
	this.changeComponent = changeComponent;													//Assign the method that will transform the component elements
	this.changeRepeat = changeRepeat;														//Assign the method that will transform the repeat elements
	this.changeBag = changeBag;																//Assign the method that will transform the bag elements
	
	this.unionToType = unionToType;															//Assign the method use to transform a list of complex types in a list of simples types
	
	this.callBack = callBack;																//Assign the method called at each transformation of xtigerNodes
	
	this.acquireComponentStructs = acquireComponentStructs;									//Assign the method that we will use to acquire the structures of the document
	this.acquireTransformationStruct = acquireTransformationStruct;							//Assign the method to acquire the transformation structure of the xtiger elements (use, component, repeat, etc...)
	this.acquireUnion = acquireUnion;														//Assign the method to acquire the union and others types.	
	
	this.acquireTransformationStruct(url);													//Launch the acquisition of the transformation structure defined in the document at the specified URL
	this.acquireComponentStructs(doc);														//Acquire the structures of the specified document
	this.acquireUnion(doc);																	//Acquire the unions
	
	
}


/***********************************************************************************************************
*																				*
*					Functions that find xtiger elements and launch transformations					*
*																				*
/***********************************************************************************************************/

/*Function that call teh transformation when it is needed*/
function xtigerToHTML(currentNode, newNode){												//use two nodes in arguments, the first one correspond of the node in the orginal xtiger document, that won't change and the second one is the node of the new tree we will display
	if(currentNode.nodeType == 1){															//first, we verify that we have an element node, if not, we don't change it and keep it
	
		switch(currentNode.localName){														//Then we look for the element tagName, if it is a xtiger node, we launch the modification, if not, we continue recursively the transformation
			
			case "option":																	//It is an option,
				this.changeOption(currentNode,newNode);										//so apply the transformation corresponding to the option
				break;
			
			case "component":																//It is a component
				this.changeComponent(currentNode,newNode);									//so apply the transformation corresponding to the component
				break;
				
			case "repeat":																	//It is a repeat
				this.changeRepeat(currentNode,newNode);										//so apply the transformation corresponding to a repeat
				break;
				
			case "use":																		//It is a use
				this.changeUse(currentNode,newNode);										//try to guess we will do
				break;
				
			case "bag" :																	//It is a bag
				this.changeBag(currentNode, newNode);										//like before
				break;
				
			default :																		//it is not a xtiger element, for each child, we will launch the function xtigerToHTML
				this.continueRecursion(currentNode, newNode);								//we continue the recursion 
		}
	}
	
}

/*function we use to continue the recursion ; when we find a node that is not a xtiger node, we cal this method to define the following node to transform*/
function continueRecursion(currentNode, newNode){											//two arguments, use to work on the html tree and the xtiger tree
	
	var currentInc = 0;																		//index we use for the currentNode
	var newInc = 0;																			//index we use for the newNode
																				
	var testContinue = new RegExp("<[^>]*[(component)(use)(repeat)(option)]");				//Regular expression used to define if we have a xtiger node in the tree we work on ( root is newNode)
	
	while(currentInc < currentNode.childNodes.length && newInc < newNode.childNodes.length){
																							//we loop to find all the children and apply the recursive transformation, the two following loops are used 
					
		while(currentNode.childNodes[currentInc] != currentNode.lastChild && currentNode.childNodes[currentInc].nodeType !=1){
																							//loop use to take only the element children of the currentNode, allow to synchronize the currentChild and the newChild
			currentInc++;
		}
					
		while(newNode.childNodes[newInc] != newNode.lastChild && newNode.childNodes[newInc].nodeType !=1){
																							//loop use to take only the element children of the newNode, allow to synchronize the currentChild and the newChild
			newInc++;
		}
		
		var nameSpace = newNode.childNodes[newInc].namespaceURI;							//we define here the namespace of the node we work on
		
		if(nameSpace == "http://www.w3.org/1999/xhtml"){									//if it is a xhtml node, we can use directly the innerHTML attribute
			
			if(testContinue.test(newNode.childNodes[newInc].innerHTML)){					//we ferify that there is a xtiger node, and in this case
				
				this.xtigerToHTML(currentNode.childNodes[currentInc], newNode.childNodes[newInc]);
																							//launch the transformation on the current child
			}
			
		}else{																				//we don't have a xhtml node, so we have to extract the inner attribute
		
			if(testContinue.test(extractInner(newNode.childNodes[newInc], true))){			//verify that we have a xtiger node, and in this case
					
				this.xtigerToHTML(currentNode.childNodes[currentInc], newNode.childNodes[newInc]);
																							//launch the transformation on the current child
			}
		}
		currentInc ++;																		//take the following child node of currentNode 
		newInc++;																			//take the following child node of newNode 
	}
	
}

/***********************************************************************************************************
*																				*
*							Functions that acquires structures and types						*
*																				*
/***********************************************************************************************************/

//Function that allow to acquire all the structures of the component.
function acquireComponentStructs(aDocument){												//aDocument is the document from whick we extract all the components

	var structs = aDocument.getElementsByTagName("component");								//Take all the component of the xtiger
	var mapStructs = new Object();															//create a hashmap
	var mapTypes = new Array();
	for(var inc = 0; inc< structs.length; inc++){											//for all components
		mapTypes.push(structs[inc].getAttributeNode('name').value);
		this.componentStructs[structs[inc].getAttributeNode('name').value] = structs[inc];	//add it to the hashmap
	}
	
	this.unionList['anyComponent'] = mapTypes;												//add the type anyComponent in the list of possible types
}

//function that acquire  the complex types and set it in the object
function acquireUnion(aDocument){															//aDocument is the XTIGER document from which we take the union and define types
	var unionList = aDocument.getElementsByTagName("union");								//take all union
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
}

//Function that acquire the structure of the transformation defined by the developper
function acquireTransformationStruct(url){													//url is the URL of the document where are the defined 
	
	var transStructs = new Array();															//create the object that will temporary contain the structures for the transformation
	var typesClass = new Object();															//create object that will contain the type of the target language
	var typesStructs = new Object();														//create object that will contain the special structure 
	var xhr; 																				//variable we will use to create an ajax request
    
	try {  																					//try/catch that serves to create an ajax request indepedently to the browser used
		xhr = new ActiveXObject('Msxml2.XMLHTTP'); 
		xhr.async =false;
	}catch (e){
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
	
    xhr.onreadystatechange  = function(){ 													//when the ajax request is ready, apply the following function
        if(xhr.readyState  == 4){															//if it is ready
//            if(xhr.status  == 200){ 														//and document is found
	            if((xhr.status  == 200) || (xhr.status  == 0)) { 														//and document is found
	
				
				var documentString = xhr.responseText;										//the value of the request(a string) is set in a variable
				
				var container = document.createElement('div');								//creation of a container that will make the future manipulation easier
				documentString = documentString.replace(/^[^]*<body[^>]*>/,"");
				documentString = documentString.replace(/<\/body>[^]*$/, "");
				container.innerHTML = documentString;										//assign the value of the document to the container, innerHTML takes only the body part
				var pointer = container;													//create a pointer used to access to the nodes we want
				
				for(var inc = 0; inc < pointer.childNodes.length; inc++){					//for all the children of the body
					
					if(pointer.childNodes[inc].nodeType == 1){								//we first verify if it is an element node
						
						var contTemp = document.createElement('div');						//div that will serve to extract the content of the structure in a string using innerHTML
						
						switch(pointer.childNodes[inc].className){							//we will extract the structure using the name of it
							
							case "use" :													//we have found the structure to apply for the use
								contTemp.appendChild(pointer.childNodes[inc]);				//put the structure to the object conTemp
								transStructs["useStruct"] = contTemp.innerHTML;				//set it to the transformation structs
								break;
								
							case "component" :												//like the use
								contTemp.appendChild(pointer.childNodes[inc]);
								transStructs["componentStruct"] = contTemp.innerHTML;
								break;
								
							case "option" :													//like the component
								contTemp.appendChild(pointer.childNodes[inc]);
								transStructs["optionStruct"] = contTemp.innerHTML;
								break;
								
							case "repeat" :													//like the repeat, oups, sorry, like the option
								contTemp.appendChild(pointer.childNodes[inc]);
								transStructs["repeatStruct"] = contTemp.innerHTML;
								break;
								
							case "bag" : 													//like above
								contTemp.appendChild(pointer.childNodes[inc]);
								transStructs["bagStruct"] = contTemp.innerHTML;
								break;
							
							case "anyElement" :												//we have found the target language
								typesClass = pointer.childNodes[inc].textContent.split(" ");//and we take all the types
								break;
								
							case "typesStructs":											//we have found special structures
								var newPointer = pointer.childNodes[inc];					//the pointer is changed
								for(var inc2 = 0; inc2 < newPointer.childNodes.length;inc2++){
																							//for each child of the newPointer
										var name = newPointer.childNodes[inc2].className;	//we take the class name of the child
										if(name !=null){									//if it is not null
											typesStructs[name] = newPointer.childNodes[inc2];
																							//we have found a special structure, so add it
										}
								}
								break;
								
							default:
								
						}
					}
				}
            }else{ 
                alert("Impossible to open this document. Error : " + xhr.status);
			}
        }
    }; 
	
   xhr.open( "GET", url,  false); 															//we launch the ajax request
   xhr.send(null); 																			//and send nothing
   this.useStruct = transStructs["useStruct"];												//we set all the structures to the object for the transformation
   this.componentStruct = transStructs["componentStruct"];
   this.optionStruct = transStructs["optionStruct"];
   this.repeatStruct = transStructs["repeatStruct"];
   this.bagStruct = transStructs["bagStruct"];
   
   this.unionList["anySimple"] = new Array("string", "number", "boolean");					//here we define the type anySimple and assign it
	
	for(var inc = 0; inc < this.unionList["anySimple"].length; inc++){						//here we define the default structures for  string, boolean and number
		var tempContainer = document.createElement('span');									//first we create an element
		var tempString = this.unionList["anySimple"][inc];									//we take the name of the type
		tempContainer.textContent = tempString;												//put it as text in the element created before
		this.componentStructs[tempString] = tempContainer;									//assign the structure
	}
   for(var inc = 0; inc < typesClass.length; inc ++){										//for all types of the target language
		var container = document.createElement('span');										//create a container
		container.innerHTML = typesClass[inc];												//set the type name as text
		this.componentStructs[typesClass[inc]] = container;									//assign the structure
   }
   for(typeName in typesStructs){															//for all special structs defined
		this.componentStructs[typeName] = typesStructs[typeName];							//assign it
   }
   this.unionList["anyElement"] = typesClass;												//and assign types to the lis of types
   
} 


/***********************************************************************************************************
*																				*
*					Functions that transform the xtigers element in a html representation				*
*																				*
/***********************************************************************************************************/

//Transform the option element
function changeOption(currentNode, newNode){												//Argument to work in parallele with the xtiger nodes and the html representation node
	
	var stringStruct = this.optionStruct;													//take the new Structure defined
	var container = document.createElement('span');											//create a container that will contain the structure defined
	var label = newNode.getAttributeNode('label').value;									//take the value of the label of the option node
	
	stringStruct = stringStruct.replace(/#label/g,label);									//put the value of the label where it is asked to, using regular expression
	container.innerHTML = stringStruct;														//set the structure to the container
	
	var pointer = container;																//The pointer to the node that will contain the content of the newNode
	var isContent = new RegExp("#content");													//The regular expression used to find if #content is present in the node
	var isContentEnd = new RegExp("^[\s\n\f\r\t\v]*#content[\s\n\f\r\t\v]*$");				//the regular expression used to find if #content is the only present word
	
	while(isContent.test(pointer.innerHTML)){												//loop that serves to find the pointer, synchronize  children of the current node, with children of the new node
		
		if(isContentEnd.test(pointer.innerHTML)){											//if the pointer has only the text #content, it is our point
			
			pointer.innerHTML = "";															//set the pointer.innerHTML to empty
			assignChild(newNode, pointer);													//put the value of the content to the node (replace #content by its value)
			break;																			//stop the while
		
		}
		
		for(var inc = 0; inc < pointer.childNodes.length; inc++){							//loop that serves to find the child that contains the value #content
			
			var nameSpace = pointer.childNodes[inc].namespaceURI;							//take the value of the namespace to know if we can use innerHTML or we have to extract it
			
			if(nameSpace == "http://www.w3.org/1999/xhtml"){								//it's an xhtml node, we can use innerHTML
				
				if(isContent.test(pointer.childNodes[inc].innerHTML)){						//we have found the good child
					pointer = pointer.childNodes[inc];										//set the value of the child to the pointer
					inc = pointer.childNodes.length;										//stop the loop for
				}
				
			}else{
				
				if(isContent.test(extractInner(pointer.childNodes[inc], false))){			//we have found the good child
					pointer = pointer.childNodes[inc];										//set the value of the child to the pointer
					inc = pointer.childNodes.length;										//stop the loop for
				}
			}
		}
	}
	
	var actualNode = container.firstChild;													//take the firstchild of the container that represent the html representation
	replaceNode(newNode, actualNode);														//replace the newNode by the html representation generated
	this.callBack(currentNode, actualNode);													//function that serve to define other calculation on html representation
	this.continueRecursion(currentNode, pointer);											//continue the recursion with what is under 
	
}
//transform the component element
function changeComponent(currentNode, newNode){												//work in paralell on the xtiger document and the html representation

	var stringStruct = this.componentStruct;												//take the new Structure corresponding to the component
	var container = document.createElement('span');											//create a container that will contain the defined structure
	var label = currentNode.getAttributeNode('name').value;									//take the value of the label of the option node
	
	stringStruct = stringStruct.replace(/#name/g,label);									//put the value of the label where it is asked to, using regular expression
	container.innerHTML = stringStruct;														//set the structure to the container
	var pointer = container;																//The pointer to the node that will contain the content of the newNode
	
	var isContent = new RegExp("#content");													//The regular expression used to find if #content is present in the node
	var isContentEnd = new RegExp("^[\s\n\f\r\t\v]*#content[\s\n\f\r\t\v]*$");				//the regular expression used to find if #content is the only word present
	
	
	while(isContent.test(pointer.innerHTML)){												//loop that serves to find the pointer, synchronize the newNode and the currentNode
		
		if(isContentEnd.test(pointer.innerHTML)){											//if the pointer has only the text #content, it is our point
			pointer.innerHTML = "";															//put the value of pointer to null
			assignChild(newNode, pointer);													//put the value of the content to the node (replace #content by its value)
			break;																			//stop the while
		}
		
		for(var inc = 0; inc < pointer.childNodes.length; inc++){							//loop that serves to find the child that contains the value #content
			
			var nameSpace = pointer.childNodes[inc].namespaceURI;							//take the namespace to know if we can use innerHTML directly or if we have to extract it.
			
			if(nameSpace == "http://www.w3.org/1999/xhtml"){								//it is a xhtml node
				
				if(isContent.test(pointer.childNodes[inc].innerHTML)){						//we have found the good child
				
					pointer = pointer.childNodes[inc];										//set the value of the child to the pointer
					inc = pointer.childNodes.length;										//stop the loop for
				}	
				
			}else{																			//it is not a xhtml node
			
				if(isContent.test(extractInner(pointer.childNodes[inc], false))){			//we have found the good child
					
					pointer = pointer.childNodes[inc];										//set the value of the child to the pointer
					inc = pointer.childNodes.length;										//stop the loop for
				}
			}
		}
	}
	
	var actualNode = container.firstChild;													//set the html representation generated in this variable
	replaceNode(newNode, actualNode);														//put the html representation to the tree
	this.callBack(currentNode, actualNode);													//launch the callback
	this.continueRecursion(currentNode, pointer);											//continue the recursion with children
}


//transform the repeat element
function changeRepeat(currentNode, newNode){												//work in paralell with the xml document and the html representation
	
	var stringStruct = this.repeatStruct;													//take the new Structure defined
	var container = document.createElement('span');											//create a container that will contain the structure defined
	var label = newNode.getAttributeNode('label').value;									//take the value of the label of the option node
	var minOccurs;																			//variable initialisation
	var maxOccurs;																			//variable initialisation
	
	try{
		minOccurs = newNode.getAttributeNode('minOccurs').value;							//take the value of minOccurs, try & catch to define by default value
	}catch(e){
		minOccurs = 0;																		//by default it's zero
	}
	try{
		maxOccurs = newNode.getAttributeNode('maxOccurs').value;							//take the value of maxOccurs, try & catch to define by default value
	}catch(e){
		maxOccurs = "*";																	//by default it's the infinite
	}
	
	stringStruct = stringStruct.replace(/#label/g,label);									//put the value of the label where it is asked to.
	stringStruct = stringStruct.replace(/#minOccurs/g, minOccurs);							//put the value of the minimum occurs
	stringStruct = stringStruct.replace(/#maxOccurs/g, maxOccurs);							//put the value of the maximum occurs
	
	container.innerHTML = stringStruct;														//set the structure to the container
	var pointer = container;																//The pointer to the node that will contain the content of the newNode
	
	var isContent = new RegExp("#content");													//The regular expression used to find if #content is present in the node
	var isContentEnd = new RegExp("^[\s\n\f\r\t\v]*#content[\s\n\f\r\t\v]*$");				//The regular expression used to find if #content is the only word present in the node
	
	while(isContent.test(pointer.innerHTML)){												//loop that serves to find the pointer, synchronize newNode and currentNode
		
		if(isContentEnd.test(pointer.innerHTML)){											//if the pointer has only the text #content, it is our point
			pointer.innerHTML = "";															//set the content of pointer to null
			assignChild(newNode, pointer);													//put the value of the content to the node (replace #content by its value)
			break;																			//stop the while
		}
		
		for(var inc = 0; inc < pointer.childNodes.length; inc++){							//loop that serves to find the child that contains the value #content
			
			var nameSpace = pointer.childNodes[inc].namespaceURI;							//use to know if we can use innerHTML
			
			if(nameSpace == "http://www.w3.org/1999/xhtml"){								//you can use innerHTML, it's a xhtml node
			
				if(isContent.test(pointer.childNodes[inc].innerHTML)){						//we have found the good child
					
					pointer = pointer.childNodes[inc];										//set the value of the child to the pointer
					inc = pointer.childNodes.length;										//stop the loop for
				}

			}else{																			//we can't use innerHTML; we have to extract it
			
				if(isContent.test(extractInner(pointer.childNodes[inc], false))){			//we have found the good child
					pointer = pointer.childNodes[inc];										//set the value of the child to the pointer
					inc = pointer.childNodes.length;										//stop the loop for
				}
			}
		}
	}
	var actualNode = container.firstChild;													//set the structure generated to the variable actualNode
	replaceNode(newNode, actualNode);														//replace the newNode by it
	this.callBack(currentNode, actualNode);													//we launch a call back
	this.continueRecursion(currentNode, pointer);											//continue the recursion with the children
}


//transform the use element to the structure defined
function changeUse(currentNode, newNode){
	var stringStruct = this.useStruct;														//take the defined structure for the element use
	var container = document.createElement('span');											//create a container to facilitate the creation of the new structure
	var label = newNode.getAttributeNode('label').value;									//take the value of the label
	var types = newNode.getAttributeNode('types').value.split(" ");							//create an array that contains all the types of the use element
	
	types = this.unionToType(types);
	
	stringStruct = stringStruct.replace(/#label/g, label);									//Replace the parameter label by the corresponding value
	stringStruct = stringStruct.replace(/#content/g, extractInner(currentNode, false));
	container.innerHTML = stringStruct;														//set to the container the structure of the transformation
	
	var loopNodes = new Array();
	findLoop(container, loopNodes);															//find the nodes where we loop and stockes it in an array
	
	var isType = new RegExp('#types');
	var isContent = new RegExp('#typeStruct');												//create the regular expression to find children that contain the word typeStruct
	var isContentEnd = new RegExp('^[\s\n\f\r\t\v]*#typeStruct[\s\n\f\r\t\v]*$');			//create the regular expression to find the child that contain only the word typeStruct
	
	for(var inc = 0; inc< loopNodes.length; inc++){											//For each nodes we do a loop
		var stringLoop = loopNodes[inc].innerHTML;											//take the content of the node and put it in a string
		var stringLoopEnd = "";																//instantiate a string we will use to attach each iteration of the loop node

		
		if(isType.test(stringLoop)){
			for(var inc2 = 0; inc2 < types.length; inc2++){									//for each types the used is formed of, it will serve to create the structure of the loop and replace parameter #types by the name of the types
				var stringTemp = stringLoop.replace(/#types/g, types[inc2]);				//create a new string containing the loopContent where we replace the parameter types by the inc2'th value
				stringLoopEnd += stringTemp;												//add the inc2'th string to the entire string
			}
		}else{
			for(var inc2 = 0; inc2 < types.length; inc2++){									//for each types the used is formed of, it will serve to create the structure of the loop and replace parameter #types by the name of the types
				stringLoopEnd += stringLoop;												//add the inc2'th string to the entire string
			}
		}
		
		loopNodes[inc].innerHTML = stringLoopEnd;											//set the content of the loopNode
		if(isContent.test(stringLoop)){
			for(var inc2 = 0; inc2 < types.length; inc2++){									//loop one more time on the types, but this time i
				
		
				var pointer = loopNodes[inc];												//create a pointer that we will use to find where we have to insert the structure of the type of children
				
				while(isContent.test(pointer.innerHTML)){									//while we have the #typeStruct, we continue
					
					if(isContentEnd.test(pointer.innerHTML)){								//if the pointer has only the text #typeStruct, it is our point
						
						pointer.innerHTML = "";												//set the content of the pointer to null
						pointer.appendChild(this.componentStructs[types[inc2]].cloneNode(true));		
																							//add the corresponding structure to the child of the pointer

						this.xtigerToHTML(this.componentStructs[types[inc2]], pointer.firstChild);	
																							//launch the recursion for the type strcuture (if it is a component, we have to transform it);
						
						break;																//stop the while
					}
					
					for(var inc3 = 0; inc3 < pointer.childNodes.length; inc3++){			//loop that serves to find the child that contains the value #typesStruct
						var nameSpace = pointer.childNodes[inc3].namespaceURI;
						if(nameSpace == "http://www.w3.org/1999/xhtml"){
							if(isContent.test(pointer.childNodes[inc3].innerHTML)){			//we have found the good child
								pointer = pointer.childNodes[inc3];							//set the value of the child to the pointer
								inc3 = pointer.childNodes.length;							//stop the loop for
							}
						}else{
						
							if(isContent.test(extractInner(pointer.childNodes[inc3], false))){		
																							//we have found the good child
								pointer = pointer.childNodes[inc3];							//set the value of the child to the pointer
								inc3 = pointer.childNodes.length;							//stop the loop for
							}
												
						}
					}
	
				}
				
			}
		}
	}
	var actualNode = container.firstChild;													//take the generated representation
	
	replaceNode(newNode, actualNode);														//place it in the structure
	
	this.callBack(currentNode, actualNode);													//we have transformated a node, call the callback method
}

function changeBag(currentNode, newNode){
	var stringStruct = this.bagStruct;														//take the defined structure for the element use
	var container = document.createElement('span');											//create a container to facilitate the creation of the new structure
	var label = newNode.getAttributeNode('label').value;									//take the value of the label
	var types = newNode.getAttributeNode('types').value.split(" ");							//create an array that contains all the types of the use element
	types = this.unionToType(types);														//translate list of type into list of types without union
	try{																					//include not mandatory
		var typeIn = currentNode.getAttributeNode('include').value.split(" ");				//take the list of types to include
		typeIn = this.unionToType(typeIn);													//translate union into types
		var typeString = " " + typeIn.join(" ") + " ";										//create a string containing the types to include separated by " "
		for(var inc = 0; inc < types.length;inc ++){										//for each type
			typeString = typeString.replace(new RegExp(" "+types[inc] + " "), " ");			//delete the type from the string if they are in the attribute types and include
		}
		typeString = typeString.substring(1, typeString.length-1);							//delete the first and the last white space
		typeIn = typeString.split(" ");														//make an array from the string containing the types
		types = types.concat(typeIn);														//Concatenate the types and include
	}catch(err){
	}
	try{																					//exclude not mandatory
		var typeString = " " + types.join(" ") + " ";										//put the value of types in a string with withe space at the beginning and at the end for the following regular expression
		var typeDel = currentNode.getAttributeNode('exclude').value.split(" ");				//take the list of types contained in exclude attribute
		typeDel = this.unionToType(typeDel);												//translate union into types
		for(var inc2 = 0; inc2< typeDel.length; inc2++){									//for each type in exclude
			typeString = typeString.replace(new RegExp(" "+typeDel[inc2]+" "), " ");		//delete it if it is present in the list of types
		}
		typeString = typeString.substring(1,typeString.length-1);							//delete the first and last white space
		types = typeString.split(" ");														//put the types in an array
	}catch(err){
	}
	
	types = this.unionToType(types);														//translate union into simple types
	
	stringStruct = stringStruct.replace(/#label/g, label);									//Replace the parameter label by the corresponding value
	
	container.innerHTML = stringStruct;														//set to the container the structure of the transformation
	
	var loopNodes = new Array();															//create the variable where we put the nodes with the class name loop
	findLoop(container, loopNodes);															//find the nodes where we loop and stockes it in an array
	
	var isType = new RegExp('#types');
	var isContent = new RegExp('#typeStruct');												//create the regular expression to find children that contain the word typeStruct
	var isContentEnd = new RegExp('^[\s\n\f\r\t\v]*#typeStruct[\s\n\f\r\t\v]*$');			//create the regular expression to find the child that contain only the word typeStruct
	
	for(var inc = 0; inc< loopNodes.length; inc++){											//For each nodes we do a loop
		var stringLoop = loopNodes[inc].innerHTML;											//take the content of the node and put it in a string
		var stringLoopEnd = "";																//instantiate a string we will use to attach each iteration of the loop node

		
		if(isType.test(stringLoop)){
			for(var inc2 = 0; inc2 < types.length; inc2++){									//for each types the used is formed of, it will serve to create the structure of the loop and replace parameter #types by the name of the types
				var stringTemp = stringLoop.replace(/#types/g, types[inc2]);				//create a new string containing the loopContent where we replace the parameter types by the inc2'th value
				stringLoopEnd += stringTemp;												//add the inc2'th string to the entire string
			}
		}else{
			for(var inc2 = 0; inc2 < types.length; inc2++){									//for each types the used is formed of, it will serve to create the structure of the loop and replace parameter #types by the name of the types
				stringLoopEnd += stringLoop;												//add the inc2'th string to the entire string
			}
		}
		
		loopNodes[inc].innerHTML = stringLoopEnd;											//set the content of the loopNode
		if(isContent.test(stringLoop)){
			for(var inc2 = 0; inc2 < types.length; inc2++){									//loop one more time on the types, but this time i
				
		
				var pointer = loopNodes[inc];												//create a pointer that we will use to find where we have to insert the structure of the type of children
				
				while(isContent.test(pointer.innerHTML)){									//while we have the #typeStruct, we continue
					
					if(isContentEnd.test(pointer.innerHTML)){								//if the pointer has only the text #typeStruct, it is our point
						
						pointer.innerHTML = "";												//set the content of the pointer to null
						pointer.appendChild(this.componentStructs[types[inc2]].cloneNode(true));		
																							//add the corresponding structure to the child of the pointer

						this.xtigerToHTML(this.componentStructs[types[inc2]], pointer.firstChild);	
																							//launch the recursion for the type strcuture (if it is a component, we have to transform it);
						
						break;																//stop the while
					}
					
					for(var inc3 = 0; inc3 < pointer.childNodes.length; inc3++){			//loop that serves to find the child that contains the value #typesStruct
						var nameSpace = pointer.childNodes[inc3].namespaceURI;
						if(nameSpace == "http://www.w3.org/1999/xhtml"){
							if(isContent.test(pointer.childNodes[inc3].innerHTML)){			//we have found the good child
								pointer = pointer.childNodes[inc3];							//set the value of the child to the pointer
								inc3 = pointer.childNodes.length;							//stop the loop for
							}
						}else{
						
							if(isContent.test(extractInner(pointer.childNodes[inc3], false))){		
																							//we have found the good child
								pointer = pointer.childNodes[inc3];							//set the value of the child to the pointer
								inc3 = pointer.childNodes.length;							//stop the loop for
							}
												
						}
					}
	
				}
				
			}
		}
	}
	var actualNode = container.firstChild;													//take the presentation created
	
	replaceNode(newNode, actualNode);														//set it
	
	this.callBack(currentNode, actualNode);													//we have created a new node, we have to call the callback
}

/***********************************************************************************************************
*																				*
*							Fonction  utilitaire										*
*																				*
/***********************************************************************************************************/

//function that serves to extract union names from a list of types and translate them into list of simple types
function unionToType(types){																//list of type to verify and transform if needed													
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
}


/*Function that give the innerHTML of a xml node*/
function extractInner(node, keep){															//node is the node we want the innerHTML, keep is used to know if we want to keep the node in the inner or not
	
	var tempNode = document.createElement('span');											//create a container
	tempNode.appendChild(node.cloneNode(true));												//put the node as a child of the container
	var inner = tempNode.innerHTML;															//take the innerHTML of the container
	
	if(!keep){																				//if we don't want to keep the node in the inner
		inner = inner.replace(/^<[^>]*>/, "");												//delete the first tag
		inner = inner.replace(/<[^>]*>$/, "");												//and it's ending part
	}
	
	return inner;																			//return what we wanted
}

//Function that replace a node bye a new one.
function replaceNode(oldNode, newNode){
	
	oldNode.parentNode.insertBefore(newNode, oldNode);										//insert the new node before the old one
	newNode.parentNode.removeChild(oldNode);												//and delete the old one
	
	return newNode;																			//return newNode
}

//Function that assign all the child of a node to another one
function assignChild(oldNode, newNode){							
	
	if(oldNode.hasChildNodes()){															//Verify the oldNode has a child
		
		var childs = oldNode.childNodes;													//take the children of oldNode
		
		for(var inc = 0; inc < childs.length ; ){											//for each child
			
			newNode.appendChild(childs[inc]);												//assign it to the newNode
		}
	}
	
	return newNode;																			//return the node to which we have assigned the children
}



//function that find the node with the className loop 
function findLoop(node, loopNodes){															//the root node of the sub-tree we look for loops, and the array to put them
	var listeNode = new Array();															//algorithm that use a stack, this array represents the stack
	listeNode.push(node);																	//at the beginning push the first node
	while(listeNode.length>0){																//while we have a node to test
		var currentNode = listeNode.pop();													//take the node on the stack
		for(var inc = 0; inc < currentNode.childNodes.length; inc++){						//for each child
			if(currentNode.childNodes[inc].nodeType ==1){									//verify it is an element
				if(currentNode.childNodes[inc].className == "loop"){						//if the class name of the child is loop
					loopNodes.push(currentNode.childNodes[inc]);							//add it to the list of nodes
				}else{																		//if not
					listeNode.push(currentNode.childNodes[inc]);							//add the node to the stack
				}
			}
		}
	}
}


//function to be developped  by the user
function callBack(currentNode, actualNode){													//the current xtiger node and the root node of the generated representation
}
