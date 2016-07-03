


// searchForCandidates();

function parseInput(){
	var searchInput = "";
	var args = process.argv.slice(2);
	args.forEach(function(arg){
		searchInput+= " " + arg ;
	})
	searchInput = searchInput.trim();
	return searchInput;
}


function searchForCandidates(){
	var searchInput = parseInput();
	var nightmare = Nightmare({
		show: false,
		'webPreferences':{partition: 'nonpersist'} //clearing cache
		});

	if(!searchInput || 0 === searchInput.length ){
		console.log("Search criteria is missing.. Please try again..");
		return;
	}
	console.log("Searching for: " + searchInput + " ....");

	Promise.resolve(
		nightmare
		.goto('https://www.linkedin.com')
		.wait(10000)
		.type('form[action*="/login-submit"] [name=session_key]', session_key)
		.type('form[action*="/login-submit"] [name=session_password]', session_password)
		.click('form[action*="/login-submit"] [type=submit]')
		.wait('#main')
		.click('#advanced-search')
		.wait('#advs-form-container')
		.type('form[action*="/vsearch/p"] [name=keywords]', searchInput)
		.wait(10000)
		.click('form[action*="/vsearch/p"] [name=submit]')
		.wait(10000)
		.evaluate(function (numOfResult) {
			var list = document.getElementById("results");
			var results = [];
			if(list){
				list = list.getElementsByClassName("people");
				for (var i = 0; i < numOfResult && i < list.length; i++) {
					var item = {name: list[i].getElementsByClassName("main-headline")[0].innerText,
					currentTitle : list[i].getElementsByClassName("description")[0].innerText,
					link :  list[i].getElementsByClassName("result-image")[0].href,
					picture : list[i].getElementsByClassName("result-image")[0].getElementsByClassName("entity-img")[0].currentSrc,
					dates:[] };
					results.push(item);
				}
			}
			return results;
		}, NUM_OF_RESULT)
		.end()
		.then(function (res) {
			console.log("Usually takes couple of minutes to retrieve all the information :)");
			var htmlRep = "";
			if(!res || res.length == 0){
				console.log('Search failed.. Please try again..');
			}
			else{
				handleResults(res).then(function(rows){
					rows.forEach(function(row){
						htmlRep += row;
					});
					saveToHtml(htmlRep, searchInput);
				}).catch(function(err){
					console.log('Search failed.. Please try again..',err);
				});
			}
		})
		.catch(function(err){
			console.log('Search failed.. Please try again..',err);
		}));
};

exports.searchForCandidates = searchForCandidates;

exports.handleResults = handleResults;

function handleResults(personList){
	return mapSeries(personList,getInfoOfPerson);
}



exports.getInfoOfPerson = getInfoOfPerson;
function getInfoOfPerson(person){
	return new Promise(function(resolve,reject){
		link = person.link;

		var nightmare = new Nightmare({
			show: false,
		 // waitTimeout: 100000 ,// in ms
		 'webPreferences':{
		 	partition: 'noPersist' 
		 }
		});
		nightmare
		.goto('https://www.linkedin.com')
		.wait(10000)
		.type('form[action*="/login-submit"] [name=session_key]', session_key)
		.type('form[action*="/login-submit"] [name=session_password]', session_password)
		.click('form[action*="/login-submit"] [type=submit]')
		.wait('#main')
		.goto(link)
		.wait(10000)
		.evaluate(function(){
			var list = document.getElementById("background-experience");
			var datesForCurrent = [];
			if(list){
				list = list.getElementsByClassName("experience-date-locale");
				for(var j = 0 ; j < list.length ; j++){
					var res = list[j].getElementsByTagName("time");
					var item = {};

					if(res && res.length > 1){
						item = {fromDate : res[0].innerText, toDate :  res[1].innerText};
					}
					else if(res && res.length == 1){
						item = {fromDate : res[0].innerText, toDate : null};
					}
					datesForCurrent.push(item);
				}
			}

			return datesForCurrent;
		})
		.end()
		.then(function(result){
			var row = "";
			var sum = "Didn't manage to summarize";
			if(!result || result.length == 0){
				console.log("There has been some issue while retrieving info about candidate: " + person.name);
			}
			else{
			sum = handleYears(result);
		}
		row = 
			'<tr>' + 
			'<td>' +
			'<img src="'+ person.picture +'" class="img-thumbnail" alt="Person Picture"></td>' +
			'<td>' + removeQuotes(JSON.stringify(person.name)) + '</td>' + 
			'<td>' + removeQuotes(JSON.stringify(person.currentTitle)) +'</td>' +
			'<td>' + sum +' </td>' +
			'<td>' + '<a href="'+ person.link +'">Profile Link</a></td>' +
			'</tr>';
			resolve(row);
		})
		.catch(function(error){
			reject("error");
			console.log('Search failed.. Please try again..',error);

		});

	})
};

function removeQuotes(str){
	return str.replace(/^"(.+(?="$))"$/, '$1');
}
//resolve promise one by one
function mapSeries(things, fn) {
	var results = [];
	return Promise.each(things, function(value, index, length) {
		var ret = fn(value, index, length);
		results.push(ret);
		return ret;
	}).thenReturn(results).all();
}
// go over experience years and summarize them
function handleYears(result){
	if(result){
		var toDate = moment();
		var fromDate = moment();
		var sum = 0;
		for(var d = 0 ; d < result.length; d++){
			toDate = moment();
			fromDate = moment();
			if(result[d].toDate){
				toDate = result[d].toDate;
			}
			if(result[d].fromDate){
				fromDate = result[d].fromDate;
			}
			sum+= moment(new Date(toDate)).diff(moment(new Date(fromDate)), 'years');
		}
		return sum;
	}
}




function buildHtml(contentToSave, searchInput) {
	var header = '<meta charset="utf-8">' +
	'<meta http-equiv="X-UA-Compatible" content="IE=edge">' +
	'<meta name="viewport" content="width=device-width, initial-scale=1">' +
	'<link href="http://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" rel="stylesheet">';
	
	var body =  ' <h1 style="text-align:center; color: green; font-weight: bold;">Candidates Search for:' + searchInput + ' </h1> ' +
	'<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>' +
	'<script src="http://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js"></script>' +
	'<br>' +
	'<table class="table">' + 
	' <thead> ' +
	' <tr>' +
	' <th>Picture</th>'+
	'<th>Name</th>'+
	'   <th>Current Title</th>'+
	'<th>Experience in years</th>'+
	'   <th>Public Profile</th>'+
	' </tr>'+
	' </thead>'+
	' <tbody>'+
	contentToSave + 
	'  </tbody>'+
	' </table>';

	return '<!DOCTYPE html>'
	+ '<html><header>' + header + '</header><body>' + body + '</body></html>';
};




function saveToHtml(contentToSave, searchInput){
	var fileName = moment().format('DD.MM.YYYY') + "-" + searchInput + ".html";
	var path = getUserHome() + '/' + fileName;
	console.log("Creating File : " + fileName);
	fs.access(path , fs.R_OK | fs.W_OK, (err) => {
		path = fileName;
	});
	try{
		var stream = fs.createWriteStream(path);

		stream.once('open', function(fd) {
			var html = buildHtml(contentToSave,  searchInput);

			stream.end(html);
		});

		console.log("File : " + fileName + " created successfully.");
	}
	catch(err){
		console.log("Cannot Write to path: " + path);
	}
}


function getUserHome() {
	return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'] + '/Desktop' ;
}
