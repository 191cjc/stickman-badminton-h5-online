package bobby
{
   import bobby.classes.RGB;
   import flash.display.DisplayObject;
   import flash.display.DisplayObjectContainer;
   import flash.geom.ColorTransform;
   import flash.net.URLRequest;
   import flash.net.navigateToURL;
   
   public class §_-2W§
   {
      
      public function §_-2W§()
      {
         super();
      }
      
      public static function §_-55§(param1:DisplayObject, param2:DisplayObjectContainer, param3:Number = 0, param4:Number = 0) : *
      {
         param2.addChild(param1);
         param1.x = param3;
         param1.y = param4;
         return param1;
      }
      
      public static function §_-34§(param1:Array) : *
      {
         var _loc2_:* = 0;
         _loc2_ = 0;
         while(_loc2_ < param1.length)
         {
            param1[_loc2_].handleEnterFrame();
            _loc2_++;
         }
         _loc2_ = 0;
         while(_loc2_ < param1.length)
         {
            if(param1[_loc2_].removeMe)
            {
               param1[_loc2_].remove();
               §_-3e§.§_-2h§(param1,param1[_loc2_]);
               _loc2_--;
            }
            _loc2_++;
         }
      }
      
      public static function §_-4D§(param1:String) : void
      {
         navigateToURL(new URLRequest(param1));
      }
      
      public static function §default§(param1:Object, param2:uint) : void
      {
         var _loc3_:ColorTransform = new ColorTransform();
         _loc3_.color = param2;
         param1.transform.colorTransform = _loc3_;
      }
      
      public static function §_-4B§(param1:Object, param2:String, param3:Number = 0.5) : uint
      {
         var _loc5_:uint = 0;
         var _loc4_:ColorTransform = new ColorTransform();
         var _loc6_:RGB = new RGB();
         var _loc7_:RGB = new RGB();
         var _loc8_:RGB = new RGB();
         _loc6_.r = parseInt("0x" + param2.charAt(0) + param2.charAt(1));
         _loc6_.g = parseInt("0x" + param2.charAt(2) + param2.charAt(3));
         _loc6_.b = parseInt("0x" + param2.charAt(4) + param2.charAt(5));
         _loc7_.r = param1.transform.colorTransform.redOffset;
         _loc7_.g = param1.transform.colorTransform.greenOffset;
         _loc7_.b = param1.transform.colorTransform.blueOffset;
         _loc8_.r = int(_loc6_.r * param3 + _loc7_.r * (1 - param3));
         _loc8_.g = int(_loc6_.g * param3 + _loc7_.g * (1 - param3));
         _loc8_.b = int(_loc6_.b * param3 + _loc7_.b * (1 - param3));
         _loc5_ = uint(_loc8_.r << 16 | _loc8_.g << 8 | _loc8_.b);
         §default§(param1,_loc5_);
         return _loc5_;
      }
   }
}

