/*

  xTigerTrans : viewer.js

  viewerApp object to be used as application controller for viewer.xhtml   

  Dependencies: xtiger/utilities, xtiger/xtigertrans and "DOM Hooks"

*/

function viewerApp (vpath, tpath, hooks) {
		this.hooks = hooks;
		this.viewPath = null;
		this.templatePath = null;
		this.viewList = null;
		this.templateList = null;
		this.curTransfo = null;		
		this.setContainerPaths (vpath,tpath);
}

viewerApp.prototype = {
	
	PROXY : "../proxy/myContentProxy.php?target=",
	
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
	
		// Loads transformation file in the container frame (and its stylesheet and javascript dependencies...)
		// Maybe we could proceed the other way and load the XTiger template file inside the frame
		// but then I don't know how to easily include the transformation stylesheet and javascript files...
		this.hooks['FRAME_ID'].setAttribute('src', this.curTransfo);
		// Control should be passed to transformCurTemplate next...
	},

	continueVisualization : function () {
		// Delete all children of the transformation body
		var d = this.hooks['FRAME_ID'].contentDocument; 
		var body = d.getElementsByTagName('body')[0];
		var cur;
		while (cur = body.firstChild) {
			// peut-être préserver certains noeud (class="preserve") et insérer le doc dans un placeholder ?
			if ((cur.nodeType == Node.ELEMENT_NODE) || (cur.nodeType == Node.TEXT_NODE)) {
				body.removeChild(cur);
			}
		}
				
		// Load the xtiger document to render and replace the transformation body by its content
		// FIXME: ca serait bien d'insérer les style sheets importés par ce document dans la frame ?
    var e = this.hooks['FORM_FIELD_ID'];
    var url = xTigerUtils.makeURLForFile(e.url.value, this.PROXY);
		var xmlDoc = new xTigerUtils.XMLDocLoader();
		xmlDoc.load(url);
		if (xmlDoc.isInError()) {
			this.log(xmlDoc.error, 1);			
		}	else {
			var currentNode = xmlDoc.getDocument().getElementsByTagName('body')[0];
			var parentNode = currentNode.cloneNode(true);
			body.appendChild(parentNode);						
			// Render the view
			var structure = new xtigerTrans();   
			structure.initTransformerFromURL (xmlDoc.getDocument(), this.curTransfo);
			if (d.xTigerTransformationCallback) {
				structure.xtigerToHTML(parentNode, d.xTigerTransformationCallback);
			} else {
				structure.xtigerToHTML(parentNode);
			}
			// Give control to transformation post-generation callback if any
			if (d.xTigerPostGenerationCallBack) {
				d.xTigerPostGenerationCallBack(parentNode, d);
			}
			// Feedback
			this.log(e.url.value, 0);
		}
	},

  // supposes this.templatePath ends with '/' (normalized)
	updateSelectedTemplate : function () {
		var i = this.getFirstSelectedIndexFromSelect(this.hooks['TEMPLATE_SELECTOR_ID']);
    var e = this.hooks['FORM_FIELD_ID'];		
    e.url.value = (i == 0) ? '' : this.templatePath + this.templateList[i - 1]; // because first option is '---' 
	},
	
	// currently only displays last error message if there are several ones
	setContainerPaths : function (vpath, tpath) {
		this.log("...", 0);
		if (tpath && (tpath.length > 0) && (tpath != this.templatePath))
			this.initializeTemplateList(tpath);			
		if (vpath && (vpath.length > 0) && (vpath != this.viewPath))
			this.initializeViewList(vpath);			
	},
	
	/* Load list of view transformations in predefined container and add them as options in the appropriate selector */	
	initializeViewList : function (path) {
		var list = new xTigerUtils.FileListAction ();
		list.loadSubFoldersFrom(xTigerUtils.makeURLForFile(path, this.PROXY));
		if (list.isInError()) { // in error, do not change current template path and template list
			this.log(list.error, 1);			
		} else if (list.isEmpty()) { // empty, do not change surrent template path and template list
			this.log("View list not changed because '" + path + "' is empty", 1);
		} else {			
			var str = "<option selected='true'>" + list.getFiles().join('</option><option>') + "</option>";
			this.hooks['VIEW_SELECTOR_ID'].innerHTML = str;
			this.viewList = list.getFiles();		
			this.viewPath = path;			
		}
	},
	
	/* Load list of templates in predefined container and add them as options in the appropriate selector */
	initializeTemplateList : function (path) {
		var list = new xTigerUtils.FileListAction ();		
		list.loadxTigerTmplFrom(xTigerUtils.makeURLForFile(path, this.PROXY));
		if (list.isInError()) { // in error, do not change current template path and template list
			this.log(list.error, 1);			
		} else if (list.isEmpty()) { // empty, do not change surrent template path and template list
			this.log("Template list not changed because '" + path + "' is empty", 1);
		} else {			
			var str = "<option selected='true'>---</option><option>" + list.getFiles().join('</option><option>') + "</option>";
			this.hooks['TEMPLATE_SELECTOR_ID'].innerHTML = str;
			this.templateList = list.getFiles();
			this.templatePath = path;
			if ((path.length > 0) && (path.charAt(path.length -1) != '/')) { // normalize container path (EN FAIRE UN FONC)
				this.templatePath += '/';
			}
		}
	},
	
	log : function (msg, level) {
		var display = this.hooks['TEMPLATE_FEEDBACK_ID'];
		display.firstChild.nodeValue = msg;
		if (1 == level) 
			display.setAttribute('style','color: red');
		else 
			display.setAttribute('style','');
	},
	
}