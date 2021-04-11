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

		endpoint = app_config.applicationPath + '/did.json';
		pk.app.options(endpoint, pk.cors());
		pk.app.get(endpoint, pk.scaffold.corsOptions(), function(req, res){
			diDocument(req, res);
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
		target_link_uri: app_config.application_url + '/landing_page'
	};
	
	if (req.query && req.query.post === 'true'){
		app_instance.response_mode = 'form_post';
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
	try{
		var params = req.query.error ? req.query : req.body;
		if (params.error){
			await pk.scaffold.landingPageError(params, res, viewPath, app_config.application_url);
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
	    	app_config: app_config,
	    	iClaims: iClaims,
	    	credentialSubject: credentialSubject,
	    	instructions: instructions
	    });		
	}
	catch(err){
		//TODO:  put this somewhere useful
		console.log("ERROR:" + err);
	}
}

function diDocument(req, res){
	// corresponding did --> did:web:book.itsourweb.org:uhn
	var _document = {
		"@context": "https://w3id.org/did/v1",
		"id": "did:web:example.com",
		"publicKey": [{
		   "id": "did:web:example.com#owner",
		   "type": "Secp256k1VerificationKey2018",
		   "owner": "did:web:example.com",
		   "ethereumAddress": "0xb9c5714089478a327f09197987f16f9e5d936e8a"
		}],
		"authentication": [{
		   "type": "Secp256k1SignatureAuthentication2018",
		   "publicKey": "did:web:example.com#owner"
		}]
	};
	res.json(_document);
}
