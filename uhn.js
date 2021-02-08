module.exports = {
	registerEndpoints: registerEndpoints,
}

var pk;
var viewPath;
var app_config; // app_config
var viewPath;

async function registerEndpoints(pkSource, acSource) {
	pk = pkSource;
	app_config = acSource;
	
	console.log(app_config.client + ' starting up at ' + Date());
	
	var possibleError = '';
	try{
		viewPath = pk.app.settings.views;

		// Set up endpoints
		var endpoint = app_config.applicationPath + '/landing_page';
		pk.app.options(endpoint, pk.cors());
		pk.app.post(endpoint, pk.scaffold.corsOptions(), function(req, res){
			landing_page(req, res);
		});
		pk.app.get(endpoint, pk.scaffold.corsOptions(), function(req, res){
			landing_page(req, res);
		});

		pk.app.get(app_config.applicationPath, pk.scaffold.corsOptions(), function(req, res){
			startApplication(req, res);
		});
	}
	catch(err){
		console.log("*** ERROR ****")
		console.log(possibleError);
		console.log(err);
		process.exit(-1);
	}
}

async function startApplication(req, res) {
	res.set ({
		'Cache-Control': 'no-store',
		'Pragma': 'no-cache'
	});

	var app_instance = {
		target_link_uri: app_config.applicationUrl + '/landing_page'
	};
	
	var response_mode = undefined;
	if (req.query && req.query.post === 'true'){
		response_mode = 'form_post';
	}

	//render the application screen
    res.render(viewPath + '/start_application', {
    	layout: 'main_responsive',
    	app_config: app_config,
    	app_instance_params: JSON.stringify(app_instance),
    	app_config_params: JSON.stringify(app_config),
    	client_api_url: app_config.client_api_url
    });
}

async function landing_page(req, res) {
	var params = req.query.error ? req.query : req.body;
	if (params.error){
		await pk.scaffold.landingPageError(params, res, viewPath, app_config.applicationUrl);
	    return;		
	}

	if (!req.body.id_token){
		throw('No id_token at landing_page');
	}

	var idToken = decodeURIComponent(req.body.id_token);
	var iClaims = JSON.parse(idToken);

	var credentialSubject = iClaims.presentedVcs[0].vc.credentialSubject;
    var instructions;
    if (credentialSubject.status === 'OK'){
    	instructions = 'Welcome, ' + credentialSubject.firstName + ' ' + credentialSubject.lastName;
    }
    else{
    	instructions = 'Automated entry not available.  Status is "' + credentialSubject.status + '"';
    }

	res.render(viewPath + '/enter', {
    	layout: 'main_responsive',
    	iClaims: iClaims,
    	credentialSubject: credentialSubject,
    	instructions: instructions
    });
}

