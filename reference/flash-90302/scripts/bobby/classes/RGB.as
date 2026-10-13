package bobby.classes
{
   import flash.geom.ColorTransform;
   
   public class RGB
   {
      
      public var r:uint;
      
      public var g:uint;
      
      public var b:uint;
      
      public function RGB(param1:uint = 0, param2:uint = 0, param3:uint = 0)
      {
         super();
         this.r = param1;
         this.g = param2;
         this.b = param3;
      }
      
      public static function uintToRGBHex(param1:uint) : String
      {
         var _loc2_:ColorTransform = new ColorTransform();
         _loc2_.color = param1;
         var _loc3_:RGB = new RGB(_loc2_.redOffset,_loc2_.greenOffset,_loc2_.blueOffset);
         return _loc3_.getRGBHex();
      }
      
      private static function _convertChannelToHexStr(param1:uint) : String
      {
         if(param1 > 255)
         {
            param1 = 255;
            trace("hex val overloaded");
         }
         var _loc2_:String = param1.toString(16);
         if(_loc2_.length < 2)
         {
            _loc2_ = "0" + _loc2_;
         }
         return _loc2_;
      }
      
      public function setByHex(param1:uint) : void
      {
         var _loc2_:ColorTransform = new ColorTransform();
         _loc2_.color = param1;
         this.r = _loc2_.redOffset;
         this.g = _loc2_.greenOffset;
         this.b = _loc2_.blueOffset;
      }
      
      public function getOctalString() : String
      {
         return "0x" + this.getRGBHex();
      }
      
      public function getUint() : uint
      {
         var _loc1_:ColorTransform = new ColorTransform();
         _loc1_.redOffset = this.r;
         _loc1_.greenOffset = this.g;
         _loc1_.blueOffset = this.b;
         return _loc1_.color;
      }
      
      public function getRGBHex() : String
      {
         var _loc2_:uint = 0;
         var _loc3_:uint = 0;
         var _loc1_:String = RGB._convertChannelToHexStr(this.r) + RGB._convertChannelToHexStr(this.g) + RGB._convertChannelToHexStr(this.b);
         _loc2_ = uint(_loc1_.length);
         if(_loc2_ < 6)
         {
            while(_loc3_ < 6 - _loc2_)
            {
               _loc1_ += "0";
               _loc3_++;
            }
         }
         return _loc1_;
      }
   }
}

