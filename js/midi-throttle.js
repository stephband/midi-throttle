(function(undefined) {
	var defaults = {

	    };

	var ports = [];

	function createId(n) {
		// Identify the number as a base 16 two character string.
		return ('0' + n.toString(16)).slice(-2);
	}

	function createKey(data, port) {
		// Returns a sortable key that identifies this port, event and number.
		var portId, i;

		if (port === undefined) {
			portId = 'xx';
		}
		else {
			i = ports.indexOf(port);
			portId = createId(i === -1 ? ports.push(port) - 1 : i);
		}

		return portId +
			// Identify message and channel, with noteoffs as noteons
			(data[0] < 144 ? data[0] + 16 : data[0]) +
			// Identify the message number, excepting messages over 191 
			(data[0] > 191 ? 'xx' : createId(data[1])) ;
	}

	function createSettings(options) {

	}

	// Node prototype

	var proto = {
		out: out1,
		send: send
	};

	function out1(fn) {
		// Override send with this listener function
		this.send = fn;
		this.out = out2;
	}

	function out2(fn) {
		var listeners = [this.send, fn];

		Object.defineProperty(this, 'listeners', {
			value: listeners
		});

		this.out = out3;

		// Fall back to prototype send
		delete this.send;
	}

	function out3(fn) {
		this.listeners.push(fn);
	}

	function send(message) {
		if (!this.listeners) { return; }

		var length = this.listeners.length,
		    l = -1;

		while (++l < length) {
			this.listeners[l](message);
		}
	}


	// Functions

	function sendAll(node, store) {
		var key;

		for (key in store) {
			node.send(store[key]);
		}

		// Avoid garbage collection while sending - delete the store afterwards
		for (key in store) {
			delete store[key];
		}
	}

	function MIDIThrottle(options) {
		var node = Object.create(proto);

		var store = {};
		var queued = false;

		function trigger(now) {
			sendAll(node, store);
			queued = false;
		}

		node.in = function(e) {
			store[createKey(e.data, e.target)] = e;

			if (!queued) {
				queued = true;
				window.requestAnimationFrame(trigger);
			}
		};

		return node;
	}

	MIDIThrottle.defaults = defaults;

	// Export the Node constructor
	if (this.window && !window.exports) {
		window.MIDIThrottle = MIDIThrottle;
	}
	else {
		module.name = 'midi-graph';
		exports = MIDIThrottle;
	}
})();