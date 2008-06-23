/*

  xTigerTrans : viewer.js

  viewerApp object to be used as application controller for viewer.xhtml   

  Dependencies: xtiger/utilities, xtiger/xtigertrans and "DOM Hooks"

*/

function viewerApp (viewPath, templatePath, hooks) {
		this.hooks = hooks;
		this.viewPath = viewPath;
		this.templatePath = templatePath;
		this.viewList = null;
		this.templateList = null;
		this.curTransfo = null;
				
		/* Load list of view transformations in predefined container and add them as options in the appropriate selector */
		var views = xTigerUtils.getListOfSubFoldersFromContainer(this.viewPath);
		if (views.length > 0) {
			var str = "<option selected='true'>" + views.join('</option><option>') + "</option>";
			this.hooks['VIEW_SELECTOR_ID'].innerHTML = str;
		}
		this.viewList = views;
		
		/* Load list of templates in predefined container and add them as options in the appropriate selector */
		var templates = xTigerUtils.getListOfFilesFromContainerWithExtension(this.templatePath, 'xtd');
		if (templates.length > 0) {
			var str = "<option selected='true'>---</option><option>" + templates.join('</option><option>') + "</option>";
			this.hooks['TEMPLATE_SELECTOR_ID'].innerHTML = str;
		}
		this.templateList = templates;
}

viewerApp.prototype = {
	
	getFirstSelectedIndexFromSelect : function (sel) {
		for (var i = 0; i < sel.options.length; i++) {
	        	if (sel.options[i].selected) {
				break;
		    }
		}
		return i;
	},	
	
  startVisualization : function (ev) {			
		// Retrieve path of the transformation file
		var i = this.getFirstSelectedIndexFromSelect(this.hooks['VIEW_SELECTOR_ID']);
		this.curTransfo = this.viewPath + '/' + this.viewList[i] + '/index.xhtml';  // convention
	
		// Load transformation file in the container frame (and its stylesheet and javascript dependencies...)
		this.hooks['FRAME_ID'].setAttribute('src', this.curTransfo);
		// Control should be passed to transformCurTemplate next...
	},

	continueVisualization : function () {
		// Delete all children of the transformation body
		var d = this.hooks['FRAME_ID'].contentDocument;
		var body = d.getElementsByTagName('body')[0];
		var cur;
		while (cur = body.firstChild) {
			// peut-être préserver certains noeud (class="preserve") ?
			if ((cur.nodeType == Node.ELEMENT_NODE) || (cur.nodeType == Node.TEXT_NODE)) {
				body.removeChild(cur);
			}
		}
		// Load the xtiger document to render and replace the transformation body by its content
    var e = this.hooks['FORM_FIELD_ID'];
    var url = xTigerUtils.makeURLForFile(e.url.value, "myContentProxy.php?target=");
		var xmlDoc = xTigerUtils.loadXML(url); // tbd - check for errors (xmlDoc not what we expect...)
		var currentNode = xmlDoc.getElementsByTagName('body')[0];
		var parentNode = currentNode.cloneNode(true);
		body.appendChild(parentNode);									
		// Render the view
		var structure = new xtigerTrans(xmlDoc, this.curTransfo);
		structure.xtigerToHTML(currentNode, parentNode);
		// Give control to transformation post-generation callback if any
		if (d.xTigerPostGenerationCallBack) {
			d.xTigerPostGenerationCallBack(parentNode, d);
		}
		// Feedback
	  this.hooks['TEMPLATE_FEEDBACK_ID'].firstChild.nodeValue = e.url.value;
	},

	updateSelectedTemplate : function () {
		var i = this.getFirstSelectedIndexFromSelect(this.hooks['TEMPLATE_SELECTOR_ID']);
    var e = this.hooks['FORM_FIELD_ID'];
    e.url.value = (i == 0) ? '' : this.templatePath + '/' + this.templateList[i - 1]; // because first option is '---' 
	}	
}