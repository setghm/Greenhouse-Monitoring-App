/* Copyright (c) 2023 Set HM

    Este archivo es parte de la aplicación de monitoreo del invernadero
    La aplicación de monitoreo del invernadero es software libre: puedes redistribuirlo y/o modificarlo
    bajo los términos de la Licencia Pública General de GNU tal como se publica por
    la Free Software Foundation, ya sea la versión 3 de la Licencia, o (a su elección)
    cualquier versión posterior.
    La aplicación de monitoreo del invernadero se distribuye con la esperanza de que sea útil, pero SIN
    NINGUNA GARANTÍA; ni siquiera la garantía implícita de COMERCIABILIDAD o IDONEIDAD
    PARA UN PROPÓSITO PARTICULAR. Ver la Licencia Pública General de GNU para más detalles.
    Deberías haber recibido una copia de la Licencia Pública General de GNU junto con
    este programa. Si no, ve http://www.gnu.org/licenses/.
*/
/* =======================================================
 * ===================== SENSOR DATA =====================
 * ======================================================= */

// Steps to handle data:
// Get Data (From ThingSpeak | Compute averages)
// Save Data (To local storage)
// Show Data (In the screen)

/* ===================== CONSTANTS ===================== */

// ThingSpeak data
const READ_API_KEY = 'POX7YJPPSRKQC4CJ'
const CHANNEL_ID = 2052405
const RH_FIELD = 7,
	  SM_FIELD = 8,
	  AL_FIELD = 6,
	  T_FIELD = 2

// Número de registros por hora, por día y por semana
const DATA_PER_HOUR = 6
const DATA_PER_DAY = DATA_PER_HOUR * 24
const DATA_PER_WEEK = DATA_PER_DAY * 7

// Tiempo en milisengundos hasta la siguiente actualización de los datos
const UPDATE_TIME = 5000 // 5 segundos
// Temperatura a partir de la cual es adecuada para el crecimiento de las plantas
const NORMAL_TEMPERATURE = 10
// Temperatura a partir de la cual se considera alta o inadecuada para las plantas
const HIGH_TEMPERATURE = 33
// Rango de temperatura que se puede medir
const LOW_TEMPERATURE_LIMIT = -40
const HIGH_TEMPERATURE_LIMIT = 40
// Humedad relativa a partir de la cual es ideal las plantas
const IDEAL_RELATIVE_HUMIDITY = 80
// Humedad de la tierra a partir de la cual es ideal las plantas
const IDEAL_SOIL_MOISTURE = 50

/* ===================== LAST DATA REQUEST ===================== */

async function getLastRelativeHumidity() {
	return await getLastValue(RH_FIELD)
}

async function getLastSoilMoisture() {
	return await getLastValue(SM_FIELD)
}

async function getLastTemperature() {
	return await getLastValue(T_FIELD)
}

async function getLastAmbientalLight() {
	return await getLastValue(AL_FIELD)
}

/* ===================== AVERAGE DATA REQUEST ===================== */

async function getTemperatureTodayAverage() {
	let values = await getValues(T_FIELD, DATA_PER_DAY)
	let result = Math.trunc(average(values))
	return result
}

async function getTemperatureYesterdayAverage() {
	let values = await getValues(T_FIELD, DATA_PER_DAY * 2)
	
	// Skip one day data
	values = values.slice(0, DATA_PER_DAY)

	let result = Math.trunc(average(values))
	return result
}

async function getTemperatureTwoDaysAgoAverage() {
	let values = await getValues(T_FIELD, DATA_PER_DAY * 3)

	// Skip two days data
	values = values.slice(0, DATA_PER_DAY)

	let result = Math.trunc(average(values))
	return result
}

async function getTemperatureWeekAverage() {
	let values = await getValues(T_FIELD, DATA_PER_WEEK)
	let result = Math.trunc(average(values))
	return result
}

async function getAmbientalLightHourAverage(hoursAgo) {
	let values = await getValues(AL_FIELD, DATA_PER_HOUR * (hoursAgo + 1))

	// Skip hoursAgo data
	values = values.slice(0, DATA_PER_HOUR * (hoursAgo + 1))

	let result = Math.trunc(average(values))
	return result
}

/* =======================================================
 * ===================== UI ELEMENTS =====================
 * ======================================================= */

function registerBackButton(selector, route) {
    const button = document.querySelector(selector)
    button.addEventListener('click', () => {
        window.location.href = route
    })
}

function registerDialog(rootSelector, buttonOpenSelector, buttonCloseSelector) {
	const root = document.querySelector(rootSelector)
	const buttonOpen = document.querySelector(buttonOpenSelector)
	const dialog = root.querySelector('.app-dialog')

	if (root.hidden === undefined) {
		root.hidden = true
	}

	const openDialog = () => {
		root.hidden = false
		root.classList.remove('hidden')
		dialog.classList.remove('dialog-anim-out')
		dialog.classList.add('dialog-anim-in')
	}

	const closeDialog = () => {
		root.hidden = true
		dialog.classList.remove('dialog-anim-in')
		dialog.classList.add('dialog-anim-out')
		setTimeout(() => {
			root.classList.add('hidden')
		}, 250)
	}

	buttonOpen.addEventListener('click', openDialog)
	
	root.addEventListener('click', (e) => {
		if (e.target === root) {
			closeDialog()
		}
	})

	const buttonClose = root.querySelector(buttonCloseSelector)

	if (buttonClose) {
		buttonClose.addEventListener('click', closeDialog)
	}
}

function registerPageNavigator(selector, page) {
    const navigator = document.querySelector(selector)
    navigator.addEventListener('click', () => {
        window.location.href = page
    })
}


/* =======================================================
 * ===================== INDICATORS ======================
 * ======================================================= */

/*================== GENERAL INDICATORS ==================*/

function circularIndicatorSetValue(id, value) {
	const element = document.getElementById(id)
	const circle2 = element.querySelectorAll('circle')[1]
	const text = element.querySelector('.value')

	let d = circle2.r.baseVal.value * 2 * Math.PI

	circle2.style.strokeDashoffset = `${ d - (d * value / 100) }`
	text.innerText = value
}

function circularIndicatorSetValueInRange(id, value, min, max) {
	const element = document.getElementById(id)
	const circle2 = element.querySelectorAll('circle')[1]
	const text = element.querySelector('.value')

	// Clamp the value between min and max limits
	value = (value < min) ? min : (value > max) ? max : value

	// Calculate the range between the limits
	let range = max - min

	// Calculate the diameter
	let d = circle2.r.baseVal.value * 2 * Math.PI

	// Calculate the value in percentage
	let v = (range - Math.abs(value + min)) / range

	// Calculate the circumference to draw
	let c = d - (d * v)

	circle2.style.strokeDashoffset = `${ c }`
	text.innerText = value
}

function stateIndicatorSetValue(id, value, states) {
	const root = document.getElementById(id)
	const arrow = root.querySelector('.state-arrow')
	const label = root.querySelector('.state-label')
	const text = label.querySelector('span')

	// Clamp the value between 0 and 100
	value = (value < 0) ? 0 : (value > 100) ? 100 : value

	// Move the arrow to the desired position
	arrow.style.backgroundPositionX = `${value}%`

	// Pick a label from the states array
	let i = Math.ceil(value / (100 / states.length)) - 1

	if (i < 0) i = 0

	text.innerText = states[i]
}

function sunIndicatorSetValue(id, value) {
	const root = document.getElementById(id)
	const sun = root.querySelector('.sun')
	const sunYellow = root.querySelector('.sun-yellow')
	const sunGlow = root.querySelector('.sun-glow')
	const text = root.querySelector('.value')

	sunYellow.style.opacity = `${ (value / 200) + 0.5}`
	sunGlow.style.boxShadow = `0 0 ${(value / 100) * 300}px yellow, 0 0 200px yellow inset`

	if (value === 0) {
		sun.style.animationPlayState = 'paused'
	} else {
		sun.style.animationPlayState = 'running'
		sun.style.animationDuration = `${40 - ((value / 100) * 20)}s`
	}

	text.innerText = value
}

/*================== TEMPERATURE CARDS ==================*/

const temperatures = ['t-cold', 't-normal', 't-hot']
const tDescriptions = ['Temperatura baja', 'Temperatura adecuada', 'Temperatura alta']

// Average per day
function miniCardSetTemperature(id, value) {
	const root = document.getElementById(id)
	const text = root.querySelector('.value')
	
	text.innerText = value

	if (value > HIGH_TEMPERATURE) {
		root.classList.add('t-hot')
		root.classList.remove('t-normal')
		root.classList.remove('t-cold')
	} else if (value > NORMAL_TEMPERATURE) {
		root.classList.remove('t-hot')
		root.classList.add('t-normal')
		root.classList.remove('t-cold')
	} else {
		root.classList.remove('t-hot')
		root.classList.remove('t-normal')
		root.classList.add('t-cold')
	}
}

// Average of the last week
function cardSetTemperature(id, value) {
	const root = document.getElementById(id)
	const text = root.querySelector('.value')
	const desc = root.querySelector('.average-description')
	
	text.innerText = value

	if (value > HIGH_TEMPERATURE) {
		root.classList.add('t-hot')
		root.classList.remove('t-normal')
		root.classList.remove('t-cold')
		desc.innerText = tDescriptions[2]
	} else if (value > NORMAL_TEMPERATURE) {
		root.classList.remove('t-hot')
		root.classList.add('t-normal')
		root.classList.remove('t-cold')
		desc.innerText = tDescriptions[1]
	} else {
		root.classList.remove('t-hot')
		root.classList.remove('t-normal')
		root.classList.add('t-cold')
		desc.innerText = tDescriptions[0]
	}
}

/*================== AMBIENTAL LIGHT CARDS ==================*/

function cardSetAmbientalLight(number, value) {
	const root = document.querySelectorAll('.hour-average')[--number]
	const text = root.querySelector('.value')

	// Clamp the value between 0 and 100
	value = (value < 0) ? 0 : (value > 100) ? 100 : value

	text.innerText = value

	// Clamp the value between 1 and 100
	let v = (value <= 0) ? 1 : (value > 100) ? 100 : value
	v = Math.ceil(v / 10) * 10

	for (let i=10; i<=100; i+=10) {
		if (root.classList.contains(`p${i}`)) {
			root.classList.replace(`p${i}`, `p${v}`)
		}
	}
}

/*================== URL Utilities ==================*/

function generateURL(field, results) {
	return `https://api.thingspeak.com/channels/${CHANNEL_ID}/fields/${field}.json?api_key=${READ_API_KEY}&results=${results}`
}

async function getLastValue(field) {
	let res = await fetch(generateURL(field, 1))
	let json = await res.json()
	let v = parseInt(json["feeds"]["0"][`field${field}`])

	if (isNaN(v)) {
		v = 0
	}

	return v
}

async function getValues(field, values) {
	let res = await fetch(generateURL(field, values))
	let json = await res.json()

	let feeds = Object.values(json["feeds"])
	let data = []

	feeds.forEach(feed => {
		let v = parseInt(feed[`field${field}`])

		if (isNaN(v)) {
			v = 0
		}

		data.push(v)
	})

	return data
}

/*================== Other Utilities ==================*/

function average(array) {
	return array.reduce((a,b) => a+b) / array.length
}

function clamp(value, min, max) {
	return (value < min) ? min : (value > max) ? max : value
}
