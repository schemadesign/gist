# Requirements

 - [jmeter](http://jmeter.apache.org/download_jmeter.cgi)

# How to run it

1. Create directory `tests/load_tests/load_tests_html`, if exists make sure that it is empty.

2. Run the following command inside `tests/load_tests`:
`jmeter -n -t load_tests.jmx -l load_tests.log -f -e -o load_tests_html`

You can get the results in html report that is stored in `tests/load_tests/load_tests_html`
