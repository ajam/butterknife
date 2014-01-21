#!/usr/bin/env node

var fs = require('fs'),
		bk = require('../src/butterknife.js'),
		optimist = require('optimist'),
		dsv = require('dsv');

var argv = optimist
  .usage('Usage: butterknife -i IN_FILE -f (csv|json|tsv|psv|DELIMITER) -n TABLE_NAME -o OUT_FILE -q "QUERY" -s "SCHEMA" -m (temp|create) -c DB_CONNECTION')
  .options('h', {
    alias: 'help',
    describe: 'Display help',
    default: false
  })
  .options('i', {
    alias: 'in_file',
    describe: 'Input file',
    default: false
  })
  .options('f', {
    alias: 'format',
    describe: 'Input file format',
    default: false
  })
  .options('n', {
    alias: 'name',
    describe: 'Table name',
    default: bk.tableName()
  })
  .options('q', {
    alias: 'query',
    describe: 'Query text. Must be quoted',
    default: false
  })
  .options('s', {
    alias: 'schema',
    describe: 'Manually define a table schema. Must be quoted',
    default: null
  })
  .options('m', {
    alias: 'mode',
    describe: 'Table mode, to create permanent table use `create`',
    default: 'temp'
  })
  .options('o', {
    alias: 'out',
    describe: 'Out file',
    default: false
  })
  .options('v', {
    alias: 'flavor',
    describe: 'SQLite or PostgreSQL.',
    default: bk.flavor()
  })
  .options('c', {
    alias: 'connection',
    describe: 'Your postgres database location.',
    default: bk.connection()
  })
  .check(function(argv) {
    if ( (!argv['i'] || !argv['in_file']) && (!argv.q  || !argv['query'])) throw 'What do you want to do?';
  })
  .argv;

if (argv.h || argv.help) return optimist.showHelp();

var file_name    = argv['i'] || argv['in_file'],
 		format       = argv.f  || argv['format'],
 		in_file      = ((file_name) ? parseFile(fs.readFileSync('./' + file_name)) : false),
		table_name   = argv.n  || argv['name'],
		mode         = argv.m  || argv['mode'],
 		out_file     = argv.o  || argv['out'],
 		query_text   = argv.q  || argv['query'],
 		out_format   = argv.of || argv['out_format'],
 		schema       = argv.s  || argv['schema'],
 		connection   = argv.c  || argv['connection'],
 		flavor       = argv.v  || argv['flavor'];

function discernFormat(file_name){
	var name_arr = file_name.split('\.')
	format_name = name_arr[name_arr.length - 1];
	return format_name
}

function writeQuery(result){
	var out_format = discernFormat(out_file);
	if (out_format == 'json'){
		fs.writeFileSync(out_file, JSON.stringify(result))
	} else if (out_format == 'csv'){
		fs.writeFileSync(out_file, dsv.csv.format(result.rows))
	}
}

function parseDsv(in_file, delimit_char){
	var parser = dsv(delimit_char);
	return parser.parse(in_file.toString())
}

function parseFile(in_file){
	if (!format) {format = discernFormat(file_name) }
	if (format == 'json'){
		in_file = JSON.parse(in_file)
	} else if (format == 'csv') {
		in_file = dsv.csv.parse(in_file.toString())
	} else if (format == 'tsv') {
		in_file = parseDsv(in_file, '\t')
	} else if (format == 'psv') {
		in_file = parseDsv(in_file, '|')
	} else {
		in_file = parseDsv(in_file, format)
	}
	return in_file
}

function queryDb(){
	if (in_file) createDb();
	bk.query(query_text, function(result){
		if (!out_file){
			console.log(result)
		}else{
			writeQuery(result)
		}
	})
}

function setFlavor(){
	if (flavor == 'sqlite'){
		bk.sqlite()
	}else{
		bk.pgsql(connection)
	}
}

function createDb(){
	(mode == 'create') ? mode = true : mode = false;
	bk.createTable(in_file, table_name, schema, mode)
}

function writeCommands(){
	var commands_obj = bk.createTableCommands(in_file, table_name, schema),
	        commands = commands_obj.create + '; ' + commands_obj.insert;
	if (!out_file){
		console.log(commands)
	} else {
		console.log('Writing commands to "' + out_file + '"')
		fs.writeFileSync(out_file, commands)
	}
}

function startTheShow(){
	setFlavor();
	if (query_text){
		queryDb()
	} else if (mode == 'create'){
		createDb()
	} else {
		writeCommands();
	}
}

startTheShow();


