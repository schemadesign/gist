//
module.exports.Ops =
{
    Join: 'Join'
};
//
module.exports.MatchFns =
{
    LocalEqualsForeignString: function (localFieldValue, foreignFieldValue) {
        var returnValue = (localFieldValue === foreignFieldValue);

        return returnValue;
    },
    LocalContainsForeignString: function (localFieldValue, foreignFieldValue) {
        if (foreignFieldValue.length == 0) {
            return false;
        }
        if (localFieldValue.toLowerCase().indexOf(foreignFieldValue.toLowerCase()) != -1) {
            return true;
        }

        return false;
    },
    ForeignContainsLocalString: function (localFieldValue, foreignFieldValue) {
        if (localFieldValue.length == 0) {
            return false;
        }
        if (foreignFieldValue.toLowerCase().indexOf(localFieldValue.toLowerCase()) != -1) {
            return true;
        }

        return false;
    }
};
