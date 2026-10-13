package §_-0V§
{
   import §_-2g§.§var§;
   import §_-2s§.§_-u§;
   import bobby.§_-3e§;
   import flash.display.MovieClip;
   import flash.events.Event;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol226")]
   public class §_-51§ extends §_-h§
   {
      
      public var overheadSwing:Symbol30copy2ragdag;
      
      public var servePoint:MovieClip;
      
      public var underHitbox:MovieClip;
      
      public var underhandSwing:Symbol30copy2agr;
      
      public var serveSwing:Symbol30copy3;
      
      public var computerHitbox:MovieClip;
      
      public function §_-51§()
      {
         addFrameScript(0,this.frame1);
         super();
         §case § = 1.15;
         include = 1.1;
         §do§ = 0.96;
         §_-4d§.push("Hey cutie!");
         §_-5c§.push("Ooo I scored!");
         §_-5c§.push("Yay!");
         §_-1H§.push("Wow!");
         §_-1H§.push("Wow you\'re so good!");
         §_-2I§.push("Ooo yay!");
         §_-X§.push("So what are you doing after?");
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         super.handleStageAdd(param1);
      }
      
      override public function setupTrashTalk(param1:String) : void
      {
         var _loc2_:String = null;
         var _loc3_:§var§ = null;
         if(§_-u§.§_-1i§ == §_-5G§)
         {
            _loc2_ = "Ooo what a cute robot!";
         }
         else if(§_-u§.§_-1i§ == override)
         {
            _loc2_ = "Ooo what a cute toaster!";
         }
         else if(§_-u§.§_-1i§ == §_-5P§)
         {
            _loc2_ = "Ooo what a cute demon!";
         }
         else if(§_-u§.§_-1i§ == §_-51§)
         {
            _loc2_ = "So we meet again.";
         }
         else
         {
            _loc2_ = "Hey cutie!";
         }
         _loc3_ = new §var§(_loc2_);
         §_-h§(this).addChild(_loc3_);
         _loc3_.x = -20 * §_-3e§.§_-1w§(scaleX);
         _loc3_.y = -70;
         _loc3_.scaleX *= §_-3e§.§_-1w§(scaleX);
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         super.handleEnterFrame(param1);
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
      }
      
      internal function frame1() : *
      {
         stop();
      }
   }
}

