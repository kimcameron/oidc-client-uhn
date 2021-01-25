// set the client name
// const client_name = 'uhn';

module.exports = {
	registerEndpoints: registerEndpoints,
}

var pk;
var viewPath;
var app_config;
var request_config;
var viewPath;

async function registerEndpoints(pkSource, configSource) {
	pk = pkSource;
	app_config = configSource;
	
	console.log(app_config.client + ' starting up at ' + Date());

	applicationPath = '/' + app_config.client;	
	applicationUrl = pk.util.httpsServerUrlHref + app_config.client;

	// used tp register with API provider
	request_config = {
		"client": app_config.client,
		"company_name": app_config.company_name,
		"credential_image": app_config.company_logo,
		"instructions": app_config.instructions,
		"credential_type": app_config.credential_type,
		"credential_reason": app_config.credential_reason,
		"scope": "openid"
	}
	
	var possibleError = '';
	try{
		viewPath = pk.app.settings.views;

		// Set up endpoints
		var endpoint = applicationPath + '/landing_page';
		pk.app.options(endpoint, pk.cors());
		pk.app.post(endpoint, pk.scaffold.corsOptions(), function(req, res){
			landing_page(req, res);
		});
		pk.app.get(endpoint, pk.scaffold.corsOptions(), function(req, res){
			landing_page(req, res);
		});

		pk.app.get(applicationPath, pk.scaffold.corsOptions(), function(req, res){
			startApplication(req, res);
		});

		pk.scaffold.validateApiConfig(request_config);

		var initParams = {
			client_name: request_config.client,
			authenticator: "",
			api_config: encodeURIComponent(JSON.stringify(request_config))
		};

		console.log('Registering with ' + app_config.client_api_url);
		possibleError = 'Unable to register with API';
		var sessionKey = await pk.scaffold.registerApi(initParams);
		console.log('Successful registration: ' + sessionKey);		
	}
	catch(err){
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

	// has a wallet been specified via header or queryString?
	// if not, only scans will work
	var iss = req.header('x-did-openid');
	if (!iss){
		if (req.query.did){
			iss = req.query.did;
		}
	}
	
	// endpoint to be called followed response from the wallet
	var target_link_uri = applicationUrl + '/landing_page';

	var response_mode = undefined;
	if (req.query && req.query.post === 'true'){
		response_mode = 'form_post';
	}

	var app_instance_params = {
		client_name: app_config.client,
		credential_type: request_config.credential_type,
    	client_api_url: app_config.client_api_url,
		iss: iss,
		target_link_uri: target_link_uri
	}

	//render the application screen
    res.render(viewPath + '/start_application', {
    	layout: 'main_responsive',
    	app_instance_params: JSON.stringify(app_instance_params),
    	client_api_url: app_config.client_api_url
    });
}

async function landing_page(req, res) {
	var params = req.query.error ? req.query : req.body;
	if (params.error){
		await pk.scaffold.landingPageError(params, res, viewPath, applicationUrl);
	    return;		
	}

	if (!req.body.id_token){
		throw('No id_token at landing_page');
	}
	var iClaims = JSON.parse(req.body.id_token);

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
    	credentialSubject,
    	instructions: instructions
    });
}

