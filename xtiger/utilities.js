/*

  xTigerTrans : utilities.js

  Utility functions available in an xTigerUtils namespace

*/
var xTigerUtils = xTigerUtils ? xTigerUtils : {
	
	/*
		Return a cross-browser xmlhttp request object
	*/
	getXHR : function () {
		var xhr;
		if (window.XMLHttpRequest) {
		   xhr=new XMLHttpRequest();
		} else if (window.ActiveXObject) {
		   xhr=new ActiveXObject("Microsoft.XMLHTTP");
		}
		if (xhr == null) {
		   alert("Your browser does not support XMLHTTPRequest.");
		}
		return xhr;				
	},	

	/*
		Return a cross-browser xml document  object
	*/
	getXMLDoc : function () {
		var xmlDoc;
		try { // Firefox, Mozilla, Opera, etc. : DOM Load/Save API partially implemented
			xmlDoc = document.implementation.createDocument("","",null); 
		} catch(e) {
			try { // Internet Explorer
					xmlDoc=new ActiveXObject("Microsoft.XMLDOM");
			}catch(e){
				alert(e.message);
			}
		}
		return xmlDoc
	},	
		
	/* Turn url into a effective url that can be used to load a resource file. 

	   Simply escapes url characters if the caller has been started from a local file, otherwise 
	   appends the proxy string so that the url is accessed through a proxy.
	 */
	makeURLForFile : function (url, proxy) {
		var res = escape(url);
		if (document.location.href.match(/^file:\/\//)) {
			return res;
		} else {
			// tbd - check url contains http:// - add it otherwise
			return proxy + res;
		}
	},
		
	/* Loads a file synchronously inside a DOM Document object
	
	   The file MUST be an XML file otherwise there will be no exception raised but the parsed document 
	   will correspond to a Mozilla's error message:
	   <parsererror xmlns="http://www.mozilla.org/newlayout/xml/parsererror.xml">...</parsererror>
	*/
  loadXML : function (url) {
		var xmlDoc = xTigerUtils.getXMLDoc ();
		try {
			xmlDoc.async=false;
			xmlDoc.load(url);
		}catch(e) {
			alert(e.message);
		}	
		return xmlDoc;
	},

	/* Loads a file synchronously and returns its content as a string 
	*/
  loadText : function (url) {
		var xhr = xTigerUtils.getXHR ();
    var res;
    xhr.onreadystatechange  = function() { 								 //when the ajax request is ready, apply the following function
		  if(xhr.readyState  == 4) {													 //if it is ready
	      if((xhr.status  == 200) || (xhr.status  == 0)) {   //and document is found
					res = xhr.responseText;					//the value of the request(a string) is set in a variable
		    } else { 
          alert("Impossible to open document: ' + url + '. Error : " + xhr.status);
				}
      }
		}
   	xhr.open( "GET", url,  false); 												//we launch the ajax request
   	xhr.send(null); 																			//and send nothing		
		return res;
	},

	// TBD - adapt this function if app started from Web Server
	getListOfFilesFromContainerWithExtension : function (containerUrl, extension) {
		// tbd check extension" is not empty
		var res = new Array();
		var list = xTigerUtils.loadText(containerUrl);
		if (list) { // ok no exception was raised			
				var rext = new RegExp("\\s?([^\\s]*\\." + extension + ")", "mg");  // regexp to match file names 
				var m;
				while ((m = rext.exec(list)) != null) {
					res.push(m[1]);
				}	
			}
		return res;
	},
	
	// TBD - adapt this function if app started from Web Server (also check on Windows)
	// Exclude file names that start with '_'
	getListOfSubFoldersFromContainer : function (containerUrl) {
		// tbd check extension" is not empty
		var res = new Array();
		var list = xTigerUtils.loadText(containerUrl);
		if (list) { // ok no exception was raised			
				var rext = new RegExp("\\s?([^\\s]*)\\s0.*DIRECTORY", "mg");  // regexp to match folder names 
				var m;
				while ((m = rext.exec(list)) != null) {
						res.push(m[1]);
				}	
			}
		return res;
	}	
}

