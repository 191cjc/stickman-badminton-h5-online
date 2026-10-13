package bobby
{
   import Playtomic.Log;
   import flash.display.MovieClip;
   import flash.display.Stage;
   import flash.events.Event;
   import flash.media.Sound;
   import flash.media.SoundChannel;
   import flash.media.SoundMixer;
   import flash.media.SoundTransform;
   import flash.utils.getDefinitionByName;
   
   public class §_-3h§
   {
      
      public static var §_-5Q§:SoundChannel;
      
      public static var §_-61§:SoundChannel;
      
      public static var §_-4m§:SoundChannel;
      
      private static var §_-3f§:Stage;
      
      private static var §_-s§:MovieClip;
      
      private static var §_-4Q§:Boolean = false;
      
      private static var §_-1P§:Boolean = false;
      
      private static var §_-3k§:Boolean = false;
      
      private static var §_-0P§:Boolean = false;
      
      private static var §_-1r§:Number = 1;
      
      private static var §_-0e§:* = 1;
      
      private static var § if§:Number = 1;
      
      private static var §_-0Q§:Number = 1;
      
      private static var §_-5B§:Boolean = false;
      
      private static var §in§:Boolean = false;
      
      private static var §_-0Y§:Boolean = false;
      
      private static var §_-4c§:Number = 1;
      
      private static var §_-4O§:Number = 1;
      
      public function §_-3h§()
      {
         super();
      }
      
      public static function init(param1:MovieClip) : void
      {
         if(!§_-0P§)
         {
            §_-s§ = param1;
            §_-3f§ = param1.stage;
            §_-3f§.addEventListener("keyPressedM",§_-39§);
            §_-3f§.addEventListener(Event.ENTER_FRAME,§_-2z§);
            §_-0P§ = true;
         }
      }
      
      public static function §_-B§(param1:String, param2:Number = 1, param3:Number = 1, param4:Number = 0.3, param5:Number = 0) : void
      {
         if(§_-5B§)
         {
            §_-61§.stop();
         }
         §_-5B§ = true;
         §_-61§ = §_-0u§(param1,§_-61§,param5,9999,param2);
         §_-1r§ = param2;
         §_-l§(param3,param4);
      }
      
      public static function §_-3s§(param1:String, param2:Number = 1, param3:Number = 1, param4:Number = 0.3, param5:Number = 0) : void
      {
         if(§in§)
         {
            §_-4m§.stop();
         }
         §in§ = true;
         §_-4m§ = §_-0u§(param1,§_-4m§,param5,9999,param2);
         § if§ = param2;
         §_-0T§(param3,param4);
      }
      
      public static function §true §(param1:String) : void
      {
         §_-0Y§ = true;
         if(!§_-4Q§)
         {
            §_-5Q§ = §_-0u§(param1,§_-5Q§,0,1,1);
         }
         else
         {
            §_-5Q§ = §_-0u§(param1,§_-5Q§,0,1,0);
         }
      }
      
      public static function §_-l§(param1:Number, param2:Number = 0.3) : void
      {
         §_-0e§ = param1;
         §_-4c§ = Math.abs(§_-1r§ - §_-0e§) / (param2 * 30);
      }
      
      public static function §_-0T§(param1:Number, param2:Number = 0.3) : void
      {
         §_-0Q§ = param1;
         §_-4O§ = Math.abs(§ if§ - §_-0Q§) / (param2 * 30);
      }
      
      private static function §_-2z§(param1:Event) : void
      {
         if(§_-5B§)
         {
            if(§_-1r§ > §_-0e§)
            {
               §_-1r§ -= §_-4c§;
               if(§_-1r§ < 0)
               {
                  §_-1r§ = 0;
               }
            }
            else if(§_-1r§ < §_-0e§)
            {
               §_-1r§ += §_-4c§;
               if(§_-1r§ > 1)
               {
                  §_-1r§ = 1;
               }
            }
            §_-5v§(§_-61§,§_-1r§);
            if(§_-1P§)
            {
               §_-5v§(§_-61§,0);
            }
         }
         if(§in§)
         {
            if(§ if§ > §_-0Q§)
            {
               § if§ -= §_-4O§;
               if(§ if§ < 0)
               {
                  § if§ = 0;
               }
            }
            else if(§ if§ < §_-0Q§)
            {
               § if§ += §_-4O§;
               if(§ if§ > 1)
               {
                  § if§ = 1;
               }
            }
            §_-5v§(§_-4m§,§ if§);
            if(§_-1P§)
            {
               §_-5v§(§_-4m§,0);
            }
         }
         if(§_-0Y§)
         {
            if(§_-4Q§)
            {
               §_-5v§(§_-5Q§,0);
            }
            else
            {
               §_-5v§(§_-5Q§,1);
            }
         }
      }
      
      private static function §_-39§(... rest) : void
      {
         if(!§_-3k§)
         {
            §_-4Q§ = true;
            §_-1P§ = true;
            §_-3k§ = true;
            §_-1C§(0);
            Log.CustomMetric("MutedGame","Misc",true);
         }
         else
         {
            §_-3k§ = false;
            §_-4Q§ = false;
            §_-1P§ = false;
            §_-1C§(1);
         }
      }
      
      public static function §_-1b§() : void
      {
         SoundMixer.stopAll();
      }
      
      public static function §_-1C§(param1:Number = 1) : void
      {
         var _loc2_:SoundTransform = new SoundTransform();
         _loc2_.volume = param1;
         SoundMixer.soundTransform = _loc2_;
      }
      
      public static function §_-0F§(param1:String, param2:Number = 0, param3:Number = 1, param4:Number = 1) : void
      {
         var _loc5_:Class = getDefinitionByName(param1) as Class;
         var _loc6_:Sound = new _loc5_() as Sound;
         var _loc7_:SoundChannel = _loc6_.play(param2,param3);
         var _loc8_:SoundTransform = new SoundTransform();
         _loc8_.volume = param4;
         _loc7_.soundTransform = _loc8_;
      }
      
      public static function §_-0u§(param1:String, param2:SoundChannel, param3:Number = 0, param4:Number = 1, param5:* = 1) : SoundChannel
      {
         var _loc6_:Class = getDefinitionByName(param1) as Class;
         var _loc7_:Sound = new _loc6_() as Sound;
         param2 = _loc7_.play(param3,param4);
         var _loc8_:SoundTransform = new SoundTransform();
         _loc8_.volume = param5;
         param2.soundTransform = _loc8_;
         return param2;
      }
      
      public static function §_-5v§(param1:SoundChannel, param2:Number = 1) : void
      {
         var _loc3_:SoundTransform = new SoundTransform();
         _loc3_.volume = param2;
         param1.soundTransform = _loc3_;
      }
   }
}

