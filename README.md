# ping-livemonitor

This tool creates a service that pings an IP on a specific interval.

A web interface allows you to monitor the results in real time.

![screenshot](http://i.imgur.com/gDMwFsg.png)

More features:

- Save the pings in a daily basis as CSV file
- Send the pings to a remote server

# Building

Install all the needed packages

```bash
$ npm install
```

Copy "default-config.json" to "config.json" and make the needed changes.

Run the service

```bash
$ npm start
```