const CLIENT_ID = '892148350256-1hojf0b667161met5k1uvnjbgeaitk9a.apps.googleusercontent.com';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

const checkAuth = () => {
    gapi.auth.authorize({
	    client_id: CLIENT_ID,
	    scope: SCOPES.join(' '),
	    immediate: true,
	}, handleAuthResult);
};

const handleAuthResult = authResult => {
    const authorizeDiv = document.getElementById('authorize-div');
    if (authResult && !authResult.error) {
	authorizeDiv.style.display = 'none';
	loadSheetsApi();
    } else {
	authorizeDiv.style.display = 'inline';
    }
};

const handleAuthClick = event => {
    gapi.auth.authorize({
	    client_id: CLIENT_ID,
	    scope: SCOPES,
	    immediate: false,
	}, handleAuthResult);
    return false;
};

const printData = result => {
    console.log(result);
};

const loadSheetsApi = () => {
    const discoveryUrl = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
    gapi.client.load(discoveryUrl).then(loadSheetData(printData));
};

const loadSheetData = sheetHandler => {
    gapi.client.sheets.spreadsheets.values.get({
	    spreadsheetId: '1Vj9W2WfvG860sqfrBZReS9wp6pulPGGOKuESkNlkGUU',
	    range: 'Tree!B4:F11',
	}).then(sheetHandler);
};

const appendPre = message => {
    const pre = document.getElementById('output');
    const textContent = document.createTextNode(message + '\n');
    pre.appendChild(textContent);
};

window.onload = () => {
    setTimeout(checkAuth, 200);
};