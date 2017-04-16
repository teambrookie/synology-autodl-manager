let assert = require('assert');
let filter = require('../utils/filter');


describe('Filter', function(){
  describe('Extension filter',function(){
    it('should be the same list size if all files extension match acceptedExtensions',function(){
      let originalList = [
        {
          extension:'.mkv'
        },
        {
          extension:'.avi'
        },
        {
          extension:'.mp4'
        },
        {
          extension:'.srt'
        }
      ];
      assert.equal(originalList.length,filter.filterListByExtension(originalList).length);
    })
    it('should be one item shorter because not is acceptedExtensions',function(){
      let originalList = [
        {
          extension:'.mkv'
        },
        {
          extension:'.avi'
        },
        {
          extension:'.mp4'
        },
        {
          extension:'.srt'
        },
        {
          extension:'.sub'
        }
      ];
      assert.equal(originalList.length-1,filter.filterListByExtension(originalList).length);
    })
  })
});
