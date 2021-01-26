module.exports = {
	registerEndpoints: registerEndpoints,
}

var pk;
var viewPath;
var ac; // app_config
var viewPath;

async function registerEndpoints(pkSource, acSource) {
	pk = pkSource;
	ac = acSource;
	
	console.log(ac.client + ' starting up at ' + Date());
	
	var possibleError = '';
	try{
		viewPath = pk.app.settings.views;

		// Set up endpoints
		var endpoint = ac.applicationPath + '/landing_page';
		pk.app.options(endpoint, pk.cors());
		pk.app.post(endpoint, pk.scaffold.corsOptions(), function(req, res){
			landing_page(req, res);
		});
		pk.app.get(endpoint, pk.scaffold.corsOptions(), function(req, res){
			landing_page(req, res);
		});

		pk.app.get(ac.applicationPath, pk.scaffold.corsOptions(), function(req, res){
			startApplication(req, res);
		});

		pk.scaffold.validateRequestConfig(ac.request_config);

		var initParams = {
			client_name: ac.client,
			authenticator: "",
			api_config: encodeURIComponent(JSON.stringify(ac.request_config))
		};

		console.log('Registering with ' + ac.client_api_url);
		possibleError = 'Unable to register with API';
		var sessionKey = await pk.scaffold.registerApi(initParams);
		console.log('Successful registration: ' + sessionKey);		
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

	// has a wallet been specified via header or queryString?
	// if not, only scans will work
	var iss = req.header('x-did-openid');
	if (!iss){
		if (req.query.did){
			iss = req.query.did;
		}
	}
	
	// endpoint to be called followed response from the wallet
	var target_link_uri = ac.applicationUrl + '/landing_page';

	var response_mode = undefined;
	if (req.query && req.query.post === 'true'){
		response_mode = 'form_post';
	}

	var app_instance_params = {
		client_name: ac.client,
		credential_type: ac.credential_type,
    	client_api_url: ac.client_api_url,
		iss: iss,
		target_link_uri: target_link_uri
	}

	//render the application screen
    res.render(viewPath + '/start_application', {
    	layout: 'main_responsive',
    	app_instance_params: JSON.stringify(app_instance_params),
    	client_api_url: ac.client_api_url
    });
}

async function landing_page(req, res) {
	var params = req.query.error ? req.query : req.body;
	if (params.error){
		await pk.scaffold.landingPageError(params, res, viewPath, ac.applicationUrl);
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
    	credentialSubject: credentialSubject,
    	instructions: instructions
    });
}

