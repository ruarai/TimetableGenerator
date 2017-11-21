
var fs = require('fs');
var https = require('https');
var querystring = require('querystring');
// Jquery stuff
var cheerio = require('cheerio');


function GetTimetable(code, yr, callback) {
	// Remove white spaces from code, make upper case:
	code = code.trim().toUpperCase();

	console.log("test");

	// We should probably check if said timetable exists first!
	if (fs.existsSync('timetable/' + yr + '/' + code + '.json')) {
		// Read the file:
		fs.readFile('timetable/' + yr + '/' + code + '.json', function (err, data) {
			if (err) throw err;
			console.log(data);
			// Call the callback:
			callback(JSON.parse(data));
		});

		return true;
	}

	var html_data = '';
	var req;


	// Grab the year
	var theYear = 2017;

	try {
		theYear = parseInt(yr);
	} catch (e) {
		// Do nothing
	}

	console.log("start")


	var url = 'http://sws.unimelb.edu.au/' + theYear + '/Reports/List.aspx?objects=' + code + '&weeks=1-52&days=1-7&periods=1-56&template=module_by_group_list';

	req = $.get(url, function (data) {
		console.log('End');

		// Prepare cheerio
		var $ = cheerio.load(data);

		// Pull subject name
		var subjectTitleData = $('div[data-role="collapsible"] h3').html();

		if (subjectTitleData != null) {
			// Grab the subject title
			var subjectTitle = subjectTitleData.split('&#xA0;-&#xA0;')[1].split('\n')[0];

			var semesterData = [];

			$('table[class="cyon_table"]').each(function (tableIndex, table) {
				console.log('yes');

				$('tr', table).each(function (trIndex, tr) {
					var classInfo = $('td:nth-child(1)', tr).text().split('/');
					if (classInfo.length != 6) return;
					//var description = $('td:nth-child(2)', tr).text();

					var startInfo = $('td:nth-child(4)', tr).text().split(':');
					var start = '';
					if (parseInt(startInfo[0]) >= 12) {
						if (startInfo[0] == '12') {
							start = startInfo[0] + ':' + startInfo[1] + 'pm';
						} else {
							start = (parseInt(startInfo[0]) - 12) + ':' + startInfo[1] + 'pm';
						}
					} else {
						start = startInfo[0] + ':' + startInfo[1] + 'am';
					}
					var finishInfo = $('td:nth-child(5)', tr).text().split(':');
					var finish = '';
					if (parseInt(finishInfo[0]) >= 12) {
						if (finishInfo[0] == '12') {
							finish = finishInfo[0] + ':' + finishInfo[1] + 'pm';
						} else {
							finish = (parseInt(finishInfo[0]) - 12) + ':' + finishInfo[1] + 'pm';
						}
					} else {
						finish = finishInfo[0] + ':' + finishInfo[1] + 'am';
					}
					var durationInfo = $('td:nth-child(6)', tr).text();



					//var code = classInfo[0];
					var semester = classInfo[3];

					// Things we store
					var classType = classInfo[4] + '/' + classInfo[5];
					var day = $('td:nth-child(3)', tr).text();
					var runTimes = start + ' - ' + finish;
					var location = $('td:nth-child(8)', tr).text();
					var duration = parseInt(durationInfo[0]);

					var ourData = [classType, day, runTimes, location, duration];

					// Ensure a store for our semester exists
					if (!semesterData[semester]) semesterData[semester] = [];

					if (!(classInfo[4].indexOf('Breakout') >= 0)) {
						// Don't include breakout rooms on timetable
						// Store this class
						semesterData[semester].push(ourData);
					}
				});
			});

			// Build result array
			var result = [];
			for (var semesterID in semesterData) {
				result.push({
					sem: semesterID,
					data: semesterData[semesterID]
				});
			}
			console.log(subjectTitle);
			// Ensure directories exist:
			if (!fs.existsSync('timetable/' + yr)) {
				fs.mkdirSync('timetable/' + yr);
			}


			var fin = { name: subjectTitle, code: code, year: yr, data: result };

			// Store the results:
			fs.writeFile('timetable/' + yr + '/' + code + '.json', JSON.stringify(fin), function (err) {
				if (err) {
					console.log(err);
				}
			});

			callback(fin);
		}

	});
}


// Grabs a timetable for all the subjects in recordings.htm
function QueryRecordings() {
	var z = String(fs.readFileSync('recordings.htm'));
	z = z.split('\n');
	for (var i = 0; i < z.length; i++) {
		var a = z[i].indexOf('">') + 2;
		var code = z[i].substr(a, z[i].indexOf(' - ') - a);

		GetTimetable(code, 2013, function () { });
	}
}

// Builds a json list of subjects for auto complete:
function BuildSubjectList() {
	var lst = new Array();
	var taken = {};

	var z = String(fs.readFileSync('recordings.htm'));
	z = z.split('\n');
	for (var i = 0; i < z.length; i++) {
		var a = z[i].indexOf('">') + 2;
		var dash = z[i].indexOf(' - ')
		var code = z[i].substr(a, dash - a);
		var name = z[i].substr(dash + 3, z[i].indexOf('</a>') - dash - 3);

		// Check if we already have this subject:
		if (!taken[code]) {
			lst.push(code + ' ' + name);
		}

		// Stop same subject appearing twice:
		taken[code] = true;
	}

	var fin = JSON.stringify(lst);

	// Store the results:
	fs.writeFile('subjects.json', fin, function (err) {
		if (err) {
			console.log(err);
		}
	});
}
